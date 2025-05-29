import { ChatSemanticSearchService } from "../semantic/search/ChatSemanticSearchService";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatMessage } from "@langchain/core/messages";
import { ChatAgentFactory } from "./agent/chat-agent.factory";

export interface ChatResponse {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatService {
  private agentExecutor: RunnableWithMessageHistory<{ input: string }, any> | null = null;
  private initializing: Promise<void> | null = null;

  private agentId: string;

  constructor(
    private readonly agentFactory: ChatAgentFactory,
    agentId: string = "default",
    private tracer?: any
  ) {
    this.agentId = agentId;
  }

  /**
   * Initialise l'agent LangChain via la factory (LLM, tools, prompt, agent, executor)
   */
  private async initAgent(): Promise<void> {
    if (this.agentExecutor) return;
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      this.agentExecutor = await this.agentFactory.createAgentExecutor(this.agentId);
    })();
    await this.initializing;
    this.initializing = null;
  }

  /**
   * Utilise l'agent pour répondre à un message utilisateur (avec accès RAG et tracing automatique si configuré)
   * @param message Message utilisateur
   * @returns Réponse de l'agent
   */
  async postMessage(message: string): Promise<ChatResponse> {
    await this.initAgent();
    if (!this.agentExecutor) {
      return { role: 'assistant', content: "Erreur d'initialisation de l'agent." };
    }
    const callbacks = this.tracer ? [this.tracer] : undefined;
    try {
      const result = await this.agentExecutor.invoke(
        { 
          input: message,
        },
        {
          // This is needed because in most real world scenarios, a session id is needed per user.
          // It isn't really used here because we are using a simple in memory ChatMessageHistory.
          configurable: {
            sessionId: "foo",
          },
          callbacks,
        },
      );
      return {
        role: 'assistant',
        content: result.output ?? '',
      };
    } catch (e) {
      return {
        role: 'assistant',
        content: "Erreur lors de la génération de la réponse.",
      };
    }
  }
}


