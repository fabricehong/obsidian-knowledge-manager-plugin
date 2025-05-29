// -----------------------------------------------------------------------------
// AGENT FACTORY (simulerait agents/chat-agent.factory.ts)
// -----------------------------------------------------------------------------

// Clé mémoire utilisée à la fois dans le prompt et la mémoire
const AGENT_HISTORY_KEY = "message_history";
const AGENT_SCRATCHPAD_KEY = "agent_scratchpad";

import { IChatAgentInitializer } from "./chat-agent-initializer.interface";

/**
 * Factory orientée DI pour la création d'agents de chat.
 * Elle ne stocke que des initializers d'agents et délègue la création.
 */
export class ChatAgentFactory {
  private registry = new Map<string, IChatAgentInitializer>();

  registerAgent(initializer: IChatAgentInitializer) {
    this.registry.set(initializer.getId(), initializer);
  }

  async createAgentExecutor(id: string) {
    const initializer = this.registry.get(id);
    if (!initializer) throw new Error(`Aucun agent enregistré avec l'id: ${id}`);
    return initializer.initialize();
  }

  listAgents(): string[] {
    return Array.from(this.registry.keys());
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
