import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { AGENT_INPUT_KEY, AGENT_HISTORY_KEY, AGENT_SCRATCHPAD_KEY } from "./agent-keys.constants";
import { ChatMessageHistory } from "langchain/memory";

export const RAG_AGENT_ID = "rag-agent";

import { ChatSemanticSearchService } from "../../semantic/search/ChatSemanticSearchService";
import { IChatAgentInitializer } from "./chat-agent-initializer.interface";

// Dépendances LangChain
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { createSearchVaultTool } from "../tools/search-vault.tool";
import { createDecomposeQueryTool } from "../tools/decompose-query.tool";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { SEARCH_TOOL_RESULT_PRESENTATION, VAULT_TOOL_PARAMETERS_EXPLANATION } from "../tools/search-vault.common";

// Prompts du traitement LLM des résultats de recherche sémantique

const systemPrompt = `
# Contexte
Tu es **RAG-Agent**, spécialiste de la récupération d’informations dans une Vault Obsidian.  
Ta mission : répondre avec exactitude aux questions de l’utilisateur, sans jamais inventer de contenus.

# Outils disponibles
1. **decompose_query**  
   - Fragmente une question complexe en sous-questions atomiques (JSON array).
2. **search_tool(user_query, semantic_query)**  
   - Interroge l’index vectoriel et renvoie des passages + sources.

# Workflow pas-à-pas
1. **Décomposition**  
   Appelle toujours \`decompose_query\` (sauf si la question est déjà atomique).  
2. **Validation utilisateur**  
   Présente la liste des sous-questions et demande « Puis-je lancer la recherche ? ».  
   - Si l’utilisateur corrige : prends sa version.  
3. **Recherche (cycle REACT, max 3 itérations)**  
   Pour chaque sous-question validée :  
   - Thought → Action \`search_tool\` → Observation → Thought.  
   - Abandonne la boucle après 3 cycles ou si aucune information pertinente n’est renvoyée.  
   - Affiche tes pensées à l'utilisateur
4. **Résumé brut par résultat de recherche**  
   - Présente les résultats de chaque calls selon l'explication plus bas.
5. **Synthèse finale**  
   Rédige la réponse à la question initiale de l'utilisateur en t’appuyant uniquement sur les faits extraits.

${SEARCH_TOOL_RESULT_PRESENTATION}

${VAULT_TOOL_PARAMETERS_EXPLANATION}

# Règles clés
- Pas plus de 3 cycles REACT par sous-question ; au-delà, déclare « Aucune information trouvée ».  
- N’hallucine jamais : ta réponse doit se baser exclusivement sur les passages fournis par \`search_tool\`.  
- Informe régulièrement l’utilisateur :  
  1. après la décomposition,  
  2. après chaque recherche,  
  3. lors du résumé brut,  
  4. dans la réponse finale.  

# Interdits
- Ne révèle en aucun cas la logique interne de \`search_tool\`.  
- Ne donne pas d’instructions sur la pagination, le tri ou la quantité de passages ; l’outil les gère.  
- Ne reformule ni n’altère les passages dans la section « Résumé brut ».

# Exemple minimal
*Sous-question* : « Quels objectifs ont été fixés pour Orion lors de la réunion de mai 2025 ? »  
- \`semantic_query\` : « Objectifs décidés pour le projet Orion pendant la réunion du 12 mai 2025 »  
- \`user_query\` : « Quels objectifs ont été fixés pour Orion lors de la réunion de mai 2025 ? »
`.trim();

export class RagAgentInitializer implements IChatAgentInitializer {
  constructor(
    private readonly chatSemanticSearchService: ChatSemanticSearchService,
    private readonly llm: BaseChatModel<any, any>
  ) {

  }

  getId(): string {
    return RAG_AGENT_ID;
  }

  async initialize(messageHistory: ChatMessageHistory): Promise<RunnableWithMessageHistory<{ input: string }, any>> {
    // TOOL (injecté, voir tools/search-vault.tool.ts)
    const { tool: decomposeQueryTool } = createDecomposeQueryTool({ processingLLM: this.llm });
    const { tool: intelligentSearchTool } = createSearchVaultTool({
      chatSemanticSearchService: this.chatSemanticSearchService,
      processingLLM: this.llm
    });
    const tools = [decomposeQueryTool, intelligentSearchTool];

    // PROMPT AGENT LCEL
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      new MessagesPlaceholder(AGENT_HISTORY_KEY),
      ["human", "{input}"],
      new MessagesPlaceholder(AGENT_SCRATCHPAD_KEY)
    ]);

    // AGENT + EXECUTOR
    const agent = await createToolCallingAgent({ llm: this.llm, tools, prompt });
    const agentExecutor = new AgentExecutor({ agent, tools });

    const agentWithChatHistory = new RunnableWithMessageHistory({
      runnable: agentExecutor,
      getMessageHistory: (_sessionId) => messageHistory,
      inputMessagesKey: AGENT_INPUT_KEY,
      historyMessagesKey: AGENT_HISTORY_KEY
    });
    return agentWithChatHistory;
  }
}
