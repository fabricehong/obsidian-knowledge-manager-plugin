// -----------------------------------------------------------------------------
// AGENT FACTORY (simulerait agents/chat-agent.factory.ts)
// -----------------------------------------------------------------------------

// Clé mémoire utilisée à la fois dans le prompt et la mémoire
const AGENT_HISTORY_KEY = "message_history";
const AGENT_SCRATCHPAD_KEY = "agent_scratchpad";

import { IChatAgentInitializer } from "./chat-agent-initializer.interface";
import { RagAgentInitializer } from "./rag-agent.initializer";
import { SloganAgentInitializer, SLOGAN_AGENT_ID } from "./slogan-agent.initializer";
import { SearchVaultAgentInitializer, SEARCH_VAULT_AGENT_ID } from "./search-vault-agent.initializer";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatMessageHistory } from "langchain/memory";

/**
 * Factory orientée DI pour la création d'agents de chat.
 * Elle ne stocke que des initializers d'agents et délègue la création.
 */
export class ChatAgentFactory {
  private registry = new Map<string, IChatAgentInitializer>();

  registerAgent(initializer: IChatAgentInitializer) {
    this.registry.set(initializer.getId(), initializer);
  }

  /**
   * Enregistre tous les agents connus au démarrage (RAG, Slogan, etc.)
   */
  async createAgentExecutor(id: string, messageHistory: ChatMessageHistory) {
    const initializer = this.registry.get(id);
    if (!initializer) throw new Error(`Aucun agent enregistré avec l'id: ${id}`);
    return initializer.initialize(messageHistory);
  }

  listAgents(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Enregistre tous les agents connus au démarrage (RAG, Slogan, etc.)
   */
  static registerDefaultAgents(factory: ChatAgentFactory, llm: any, chatSemanticSearchService: any) {
    factory.registerAgent(new RagAgentInitializer(chatSemanticSearchService, llm));
    factory.registerAgent(new SloganAgentInitializer(llm));
    factory.registerAgent(new SearchVaultAgentInitializer(chatSemanticSearchService, llm));
  }
}

/**
 * Factory pour créer un AgentExecutor LangChain pour le chat
 * Structure LCEL :
 * - Prompt agent (ChatPromptTemplate)
 * - Tool(s) (issus d'une factory)
 * - Agent (createToolCallingAgent)
 * - Executor (AgentExecutor)
 */
