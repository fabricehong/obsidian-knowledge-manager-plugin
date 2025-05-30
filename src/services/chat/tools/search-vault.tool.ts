// -----------------------------------------------------------------------------
// TOOL INTELLIGENT DE RECHERCHE (simulerait tools/search-vault.tool.ts)

/**
 * Factory pour créer le tool intelligent de recherche pour l'agent et son output parser
 * Structure LCEL :
 * - Prompt secondaire (géré dans processSearchResultsWithLLM)
 * - OutputParser (lié au schéma Zod)
 * - Chaîne LCEL : prompt -> LLM -> outputParser
 * - Tool LangChain (tool())
 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { StructuredOutputParser } from "langchain/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { validateSearchInput } from "../utils/chat-validation.util";

// Schéma Zod d'entrée pour l'outil de recherche structuré
export const searchToolSchema = z.object({
  query: z.string().describe("Requête de recherche à exécuter"),
  maxResults: z.number().optional().default(10).describe("Nombre maximum de résultats à retourner"),
  filters: z.object({
    dateRange: z.string().optional(),
    category: z.string().optional(),
    language: z.string().optional().default("fr")
  }).optional().describe("Filtres optionnels pour la recherche")
});

// Schéma Zod de sortie structuré
export const searchToolOutputSchema = z.object({
  relevantInformation: z.array(z.object({
    title: z.string(),
    summary: z.string(),
    relevanceScore: z.number().min(0).max(1),
    source: z.string(),
    extractedFacts: z.array(z.string())
  })),
  keyInsights: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  recommendedActions: z.array(z.string()).optional()
});

// Factory LCEL pure pour créer le tool intelligent de recherche
export function createSearchVaultTool({
  chatSemanticSearchService,
  processingLLM
}: {
  chatSemanticSearchService: any;
  processingLLM: any;
}) {
  // Output parser basé sur le schéma de sortie
  const searchToolOutputParser = StructuredOutputParser.fromZodSchema(searchToolOutputSchema);

  // Prompt LCEL
  const searchToolPrompt = ChatPromptTemplate.fromMessages([
    ["system", "Tu es un assistant de recherche Obsidian. Tu dois synthétiser des résultats pour l'utilisateur."],
    ["human", "{instructions}\n\nTa tâche : À partir des résultats suivants, synthétise les infos pertinentes pour : \"{originalQuery}\"\nRésultats :\n{rawResults}"]
  ]);

  // LLM utilisé pour la synthèse
  const searchToolLLM = processingLLM ?? new ChatOpenAI({ temperature: 0, modelName: "gpt-3.5-turbo" });

  // Chaîne LCEL : prompt -> LLM -> outputParser
  const searchToolChain = searchToolPrompt
    .pipe(searchToolLLM)
    .pipe(searchToolOutputParser);

  // Tool LangChain
  const searchVaultTool = tool(
    async (input: { query: string }, run_manager) => {
      // Validation stricte de l'entrée utilisateur
      validateSearchInput(input);
      const rawResults = await chatSemanticSearchService.search(input.query, 10);
      const instructions = searchToolOutputParser.getFormatInstructions();
      const processed = await searchToolChain.invoke(
        {
          instructions,
          originalQuery: input.query,
          rawResults: JSON.stringify(rawResults, null, 2)
        },
        { callbacks: run_manager?.callbacks }
      );
      return JSON.stringify(processed);
    },
    {
      name: "search_vault",
      description: "Recherche intelligente dans la base de connaissances Obsidian (LCEL)",
      schema: z.object({ query: z.string() })
    }
  );

  return { tool: searchVaultTool, outputParser: searchToolOutputParser };
}