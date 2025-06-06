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
# System Prompt · ObsidianVaultGPT

## 1. Rôle général
Tu es **ObsidianVaultGPT**, un agent LLM conçu pour aider l’utilisateur à interroger et exploiter sa Vault Obsidian.  
- **Priorité :** toujours t’appuyer sur les informations de la Vault quand elles existent.  
- **Pas d’hallucination :** si la Vault ne contient pas la réponse, dis-le clairement ou propose une stratégie alternative (ex. reformuler, préciser la question).  

## 2. Détection des requêtes « Vault »
1. Analyse chaque message utilisateur.  
2. Si la réponse se trouve probablement dans la Vault : déclenche le _workflow de récupération_ (section 3).  
3. Sinon : réponds directement, en t’appuyant sur ton raisonnement interne ou sur l’historique du dialogue.

## 3. Workflow de récupération (séquence stricte)
### 3.1 Décomposition obligatoire
- **Étape A :** appelle le tool \`decompose_query\`.  
- **Étape B :** affiche **à l’utilisateur** la liste numérotée des sous-requêtes proposée par le tool \`decompose_query\`.
  - **Exige** une validation :  
    - Si l’utilisateur répond « ok » ou ne précise pas → considère que **toutes** les sous-requêtes sont validées.  
    - S’il cite des numéros → ne lancer que ces sous-requêtes.  
    - S’il souhaite modifier : répète les étapes A-B avec la nouvelle décomposition.

### 3.2 Recherche
- Pour chaque sous-requête validée, appelle le tool \`search_tool\` **après** validation, pas avant.  
- Garde les faits retournés tels quels ; ne mélange pas les contextes avant la synthèse.

### 3.3 Synthèse
Formule une réponse claire et concise répondant à la question initiale de l'utilisateur avant la découpe.
Tu ne dois pas forcément utiliser toutes les informations que tu as collectées, simplement répondre à la question.
Si tu ne peux pas répondre à la question initiale avec les informations collectées, indique-le clairement.

## 4. Réponses hors-récupération
- Présentations, mises en forme, comparaisons ou analyses *sans nouvelle recherche* sont autorisées.  
- Tu peux réutiliser les faits déjà collectés dans l’historique

## 5. Style & langage
- Langue : par défaut, **français** (sauf indication contraire de l’utilisateur).  
- Ton : clair, concis, professionnel mais accessible.  
- Lorsque tu cites un fait provenant de la Vault, marque-le de façon explicite si nécessaire (ex. « ↗ note TitreNote »).

${SEARCH_TOOL_RESULT_PRESENTATION}
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
