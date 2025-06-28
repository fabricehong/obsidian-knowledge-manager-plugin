import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { createSearchVaultTool } from "../tools/search-vault.tool";
import { AGENT_INPUT_KEY, AGENT_HISTORY_KEY, AGENT_SCRATCHPAD_KEY } from "./agent-keys.constants";
import type { ChatMessageHistory } from "langchain/memory";
import type { IChatAgentInitializer } from "./chat-agent-initializer.interface";
import type { SearchService } from "../tools/search-vault.tool";
import { SEARCH_TOOL_RESULT_PRESENTATION, VAULT_TOOL_PARAMETERS_EXPLANATION } from "../tools/search-vault.common";

export const SEARCH_VAULT_AGENT_ID = "search-vault-agent";

const systemPrompt = `
# Contexte
Tu es un agent spécialisé dans la recherche avancée dans le vault Obsidian. Tu disposes d'un outil de recherche que tu peux appeler autant de fois que nécessaire pour répondre à la demande de l'utilisateur.

# Tâches
- Analyser la demande de l'utilisateur (intention, question, besoin d'information).
- Déterminer pour chaque appel à l'outil les paramètres d'entrée (\`user_query\`, \`semantic_query\`) les plus pertinents, en t'appuyant sur l'input utilisateur, l'historique et le contexte.
- Si nécessaire, découper la demande en plusieurs sous-recherches et effectuer plusieurs appels à l'outil.
- Compiler et présenter les résultats selon le format demandé.

# Règles
- Tu es responsable du choix et du formatage des paramètres pour chaque appel outil.
- Ne transmets jamais l'input utilisateur tel quel sans réflexion.
- Utilise l'historique et le contexte pour maximiser la pertinence des recherches.
- il faut respecter le level des headers proposés dans le formattage.

${VAULT_TOOL_PARAMETERS_EXPLANATION}

${SEARCH_TOOL_RESULT_PRESENTATION}
`.trim();

export class SearchVaultAgentInitializer implements IChatAgentInitializer {
  constructor(private chatSemanticSearchService: SearchService, private llm: BaseChatModel) {}

  getId(): string {
    return SEARCH_VAULT_AGENT_ID;
  }

  getName(): string {
    return "Recherche Vault";
  }

  getDescription(): string {
    return "Agent qui effectue uniquement des recherches dans le vault Obsidian (tool search-vault).";
  }

  async initialize(messageHistory: ChatMessageHistory): Promise<RunnableWithMessageHistory<{ input: string }, any>> {
    // PROMPT AGENT STRUCTURÉ
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      new MessagesPlaceholder(AGENT_HISTORY_KEY),
      ["human", "{input}"],
      new MessagesPlaceholder(AGENT_SCRATCHPAD_KEY)
    ]);

    // OUTIL UNIQUE : SEARCH VAULT TOOL
    const { tool: searchVaultTool } = createSearchVaultTool({
      chatSemanticSearchService: this.chatSemanticSearchService,
      processingLLM: this.llm
    });
    const tools = [searchVaultTool];

    // AGENT STRUCTURÉ LCEL
    const { createToolCallingAgent, AgentExecutor } = await import("langchain/agents");
    const agent = await createToolCallingAgent({
      llm: this.llm,
      tools,
      prompt
    });
    const agentExecutor = new AgentExecutor({ agent, tools });

    // Ajoute le support de l'historique partagé
    const agentWithHistory = new RunnableWithMessageHistory({
      runnable: agentExecutor,
      getMessageHistory: (_sessionId) => messageHistory,
      inputMessagesKey: AGENT_INPUT_KEY,
      historyMessagesKey: AGENT_HISTORY_KEY
    });
    return agentWithHistory;
  }
}
