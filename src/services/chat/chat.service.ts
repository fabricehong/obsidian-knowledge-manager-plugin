import { ChatSemanticSearchService } from "../semantic/search/ChatSemanticSearchService";
import type { AgentExecutor } from "langchain/agents";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createChatAgentExecutor } from "./agent/chat-agent.factory";

export interface ChatResponse {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatService {
  private agentExecutor: AgentExecutor | null = null;
  private initializing: Promise<void> | null = null;

  constructor(
    private readonly chatSemanticSearchService: ChatSemanticSearchService,
    private readonly llm: BaseChatModel,
    private tracer?: any
  ) {}

  /**
   * Initialise l'agent LangChain (LLM, tools, prompt, agent, executor)
   */
  private async initAgent(): Promise<void> {
    if (this.agentExecutor) return;
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      this.agentExecutor = await createChatAgentExecutor({
        llm: this.llm,
        chatSemanticSearchService: this.chatSemanticSearchService,
        processingLLM: this.llm
      });
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
        { input: message },
        callbacks ? { callbacks } : undefined
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


