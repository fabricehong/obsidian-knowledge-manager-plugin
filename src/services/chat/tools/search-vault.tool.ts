import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { StructuredOutputParser } from "langchain/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai"; // Pour le fallback si besoin
import { validateSearchInput } from "../utils/chat-validation.util";
import { ObjectReferenceService } from '../utils/object-reference.service';
import { v4 as uuidv4 } from 'uuid';
import { generateActionString } from "../utils/chat-segment.util";

/**
 * Factory pour créer le tool intelligent de recherche pour l'agent et son output parser
 * Structure LCEL :
 * - Prompt secondaire (géré dans processSearchResultsWithLLM)
 * - OutputParser (lié au schéma Zod)
 * - Chaîne LCEL : prompt -> LLM -> outputParser
 * - Tool LangChain (tool())
 */

const TOOL_NAME = "search_vault";
const TOOL_DESCRIPTION = `
Recherche d'informations dans la base de connaissances Obsidian (RAG)
`.trim();

// Prompts du traitement LLM des résultats de recherche sémantique
const systemPrompt = `
{instructions}

Tu es un assistant de recherche Obsidian.

Ton objectif est de d'extraire les informations pertinentes d'une recherche.

Analyse chaque résultat de recherche, ne garde que ceux qui sont pertinents par rapport à la requête.

Pour chacun des résultats pertinents, extrait les informations pertinentes.
`.trim();

const humanPrompt = `
Requête utilisateur: "{userQuery}"

Résultats de recherche:
{rawResults}
`.trim();

// Types d'input/output générés à partir des schémas Zod
export type SearchToolInput = z.infer<typeof searchToolInputSchema>;
export type SearchToolOutput = z.infer<typeof searchToolOutputSchema>;

// Schéma Zod d'entrée pour l'outil de recherche structuré
export const searchToolInputSchema = z.object({
  userQuery: z.string().describe("Information recherchée par l'utilisateur. Utilisé pour la recherche d'information pertinente dans les résultats de recherche sémantique."),
  semanticQuery: z.string().describe("Texte qui sera transformée en embedding. Celle-ci doit optimiser le matching avec le contenu recherché"),
});

// Schéma Zod de sortie structuré
export const searchToolOutputSchema = z.array(z.object({
    source: z.string().describe("Chemin ou référence à la source d'origine dans le vault (devrait se trouver dans 'filepath')"),
    extractedFacts: z.array(z.string()).describe("Faits ou informations clés extraits de la source qui puisse donner une information pertinente par rapport à la requête"),
    actions: z.array(z.string()).describe("Actions utilisateurs devant être imprimés après le résultat")
  }).describe("Informations pertinentes extraites pour chaque résultat"));

// Service de recherche minimalement typé
export interface SearchService {
  search(query: string, maxResults: number): Promise<any[]>;
}

// Formatte un résultat pour insertion dans le scratchpad
function formatResultForScratchpad(userQuery: string, result: any): string {
  const facts = (result.extractedFacts || []).map((fact: string) => `- ${fact}`).join('\n');
  return `### ${userQuery}:
${facts}
[[${result.source}]]`;
}

// Factory LCEL pure pour créer le tool intelligent de recherche
export function createSearchVaultTool({
  chatSemanticSearchService,
  processingLLM
}: {
  chatSemanticSearchService: SearchService;
  processingLLM?: BaseChatModel<any, any>;
}): { tool: ReturnType<typeof tool>; outputParser: StructuredOutputParser<typeof searchToolOutputSchema> } {
  // Output parser basé sur le schéma de sortie
  const searchToolOutputParser = StructuredOutputParser.fromZodSchema(searchToolOutputSchema);

  const searchToolPrompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", humanPrompt]
  ]);

  // LLM utilisé pour la synthèse
  const searchToolLLM = processingLLM ?? new ChatOpenAI({ temperature: 0, modelName: "gpt-3.5-turbo" });

  // Chaîne LCEL : prompt -> LLM -> outputParser
  const searchToolChain = searchToolPrompt
    .pipe(searchToolLLM)
    .pipe(searchToolOutputParser);

  // Tool LangChain
  const searchVaultTool = tool(
    async (input: SearchToolInput, run_manager): Promise<string> => {
      // Validation stricte de l'entrée utilisateur
      // validateSearchInput(input);
      const rawResults = await chatSemanticSearchService.search(input.semanticQuery, 10);
      const instructions = searchToolOutputParser.getFormatInstructions();
      const processed: SearchToolOutput = await searchToolChain.invoke(
        {
          instructions,
          userQuery: input.userQuery,
          rawResults: JSON.stringify(rawResults, null, 2)
        },
        { callbacks: run_manager?.callbacks }
      );
      // Générer un id pour chaque résultat, enregistrer l'objet, et enrichir le JSON
      const refService = ObjectReferenceService.getInstance();
      const processedWithIds = processed.map(result => {
        const id = uuidv4();
        refService.registerObject(id, formatResultForScratchpad(input.userQuery, result));
        const actions: string[] = [generateActionString({
          type: 'action',
          action: 'add_to_scratchpad',
          buttonLabel: 'Ajouter au scratchpad',
          params: { id }
        })];
        return { ...result, actions };
      });
      return JSON.stringify(processedWithIds);
    },
    {
      name: TOOL_NAME,
      description: TOOL_DESCRIPTION,
      schema: searchToolInputSchema
    }
  );

  return { tool: searchVaultTool, outputParser: searchToolOutputParser };
}