import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { StructuredOutputParser } from "langchain/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";

/**
 * Tool LCEL de décomposition de questions complexes pour agent LangChain
 * Structure :
 * - TOOL_NAME, TOOL_DESCRIPTION
 * - Prompts (system, human)
 * - Schémas d'entrée/sortie (Zod)
 * - OutputParser
 * - Factory LCEL (createDecomposeQueryTool)
 */

// -----------------------------------------------------------------------------
// Nom et description du tool
// -----------------------------------------------------------------------------
const TOOL_NAME = "decompose_query";
const TOOL_DESCRIPTION = `
Décompose une question complexe en sous-questions atomiques (JSON array)
`.trim();

// -----------------------------------------------------------------------------
// Prompts LCEL (system + human)
// -----------------------------------------------------------------------------
const systemPrompt = `
{instructions}

Tu es un assistant expert en analyse de questions complexes.
Ta tâche : découper toute question complexe ou multi-thématique en sous-questions atomiques, claires et indépendantes, sous forme de liste JSON.
Ne réécris pas la question initiale. Ne synthétise pas. Ne réponds à aucune question, contente-toi de la décomposer.
`.trim();

const humanPrompt = `
Question complexe : {question}
Donne uniquement la liste JSON des sous-questions atomiques.
`.trim();

// -----------------------------------------------------------------------------
// Schémas Zod d'entrée et de sortie (et types)
// -----------------------------------------------------------------------------
export const decomposeQueryInputSchema = z.object({
  question: z.string().describe("Question complexe ou multi-thématique à décomposer en sous-questions atomiques")
});
export type DecomposeQueryInput = z.infer<typeof decomposeQueryInputSchema>;

export const decomposeQueryOutputSchema = z.object({
  subQuestions: z.array(z.string().describe("Sous-question atomique, claire et indépendante")).describe("Liste ordonnée des sous-questions atomiques extraites de la question initiale")
}).describe("Structure de sortie pour la décomposition de question complexe");
export type DecomposeQueryOutput = z.infer<typeof decomposeQueryOutputSchema>;

// -----------------------------------------------------------------------------
// Output parser
// -----------------------------------------------------------------------------
const decomposeQueryOutputParser = StructuredOutputParser.fromZodSchema(decomposeQueryOutputSchema);

// -----------------------------------------------------------------------------
// Prompt complet LCEL
// -----------------------------------------------------------------------------
const decomposeQueryPrompt = ChatPromptTemplate.fromMessages([
  ["system", systemPrompt],
  ["human", humanPrompt]
]);

// -----------------------------------------------------------------------------
// Factory LCEL : création du tool
// -----------------------------------------------------------------------------
export function createDecomposeQueryTool({ processingLLM }: { processingLLM: any }) {
  const decomposeQueryChain = decomposeQueryPrompt.pipe(processingLLM).pipe(decomposeQueryOutputParser);
  return {
    tool: tool(
      async (input: DecomposeQueryInput, run_manager: any) => {
        const instructions = decomposeQueryOutputParser.getFormatInstructions();
        const result = await decomposeQueryChain.invoke(
          {
            question: input.question,
            instructions
          },
          { callbacks: run_manager?.callbacks }
        );
        return JSON.stringify(result);
      },
      {
        name: TOOL_NAME,
        description: TOOL_DESCRIPTION,
        schema: decomposeQueryInputSchema
      }
    ),
    outputParser: decomposeQueryOutputParser
  };
}
