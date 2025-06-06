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
Lorsqu'une recherche d'information dans la Vault est effectuée, il faut possiblement découper la requête initiale en plusieurs sous-requêtes.

Cet outil doit systématiquement être appelé avant d'effectuer une recherche sémantique car il contient toute l'intelligence et le savoir faire pour effectuer une découpe propre.
`.trim();

// -----------------------------------------------------------------------------
// Prompts LCEL (system + human)
// -----------------------------------------------------------------------------
const systemPrompt = `
{instructions}

# Contexte
Lors d’une recherche sémantique (RAG), interroger plusieurs idées dans une même requête diminue la qualité du matching.  
Découper la requête en segments ciblés améliore la pertinence.

# Ta tâche
1. Déterminer s’il est nécessaire de découper la requête utilisateur.  
2. Si oui, formuler plusieurs sous-requêtes ; sinon, conserver la requête originale.

# Règles de découpe
- **Indépendance** : chaque sous-requête doit contenir tous les éléments de contexte nécessaires (entité, action, objet, période…).  
  - Éviter les formulations qui dépendent d’une autre sous-requête (« Pourquoi est-il sûr de cela ? »).  
- **Complétude minimale** : si la question globale relie plusieurs notions (ex. *personne + fonctionnalité*), ajouter une sous-requête qui explore explicitement cette relation (requête-pont).  
- **Utilité** : ne pas créer de sous-requête qui ne pourrait raisonnablement exister dans la base de notes (ex. un « pourquoi » abstrait sans sujet).  
- **Non-redondance** : fusionner les sous-requêtes qui chercheraient exactement la même information.  
- **Clarté & concision** : formulation précise, ~15 mots maximum.

# Exemples

### Exemple A — aucune découpe
**Requête utilisateur**  
Quelles mesures ai-je prévues pour améliorer ma concentration au travail ?

**Sous-requêtes**  
- Quelles mesures ai-je prévues pour améliorer ma concentration au travail ?

*(Une seule idée cohérente ; pas de découpe.)*

### Exemple B — découpe avec requête-pont
**Requête utilisateur**  
Quel trait particulier de Jérémy lui permet d’être si sûr de sa proposition pour la fonctionnalité « complex case icon » ?

**Sous-requêtes**  
- Quel est le trait particulier de Jérémy lié à son expertise ou sa confiance ?  
- Qu’est-ce que la fonctionnalité « complex case icon » ?  
- Quel est le rôle de Jérémy dans la conception de la fonctionnalité « complex case icon » ?  ← requête-pont

*(La requête-pont relie les deux entités.)*

### Exemple C — découpe simple
**Requête utilisateur**  
Quels livres et podcasts ai-je recommandés à Jean ?

**Sous-requêtes**  
- Quels livres ai-je recommandés à Jean ?  
- Quels podcasts ai-je recommandés à Jean ?
`.trim();

const humanPrompt = `
Requête de l'utilisateur : {question}
Donne uniquement la liste JSON des sous-questions atomiques.
`.trim();

// -----------------------------------------------------------------------------
// Schémas Zod d'entrée et de sortie (et types)
// -----------------------------------------------------------------------------
export const decomposeQueryInputSchema = z.object({
  question: z.string().describe("Requête de l'utilisateur")
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
