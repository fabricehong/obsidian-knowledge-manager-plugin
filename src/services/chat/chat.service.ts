import { ChatSemanticSearchService } from "../semantic/search/ChatSemanticSearchService";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatMessageHistory } from "langchain/memory";
import { ChatMessage } from "@langchain/core/messages";
import { ChatAgentFactory } from "./agent/chat-agent.factory";

export interface ChatResponse {
  role: 'user' | 'assistant';
  content: string;
}

import type KnowledgeManagerPlugin from '../../main';
import type { PluginSettings } from '../../settings/settings';
import { RAG_AGENT_ID } from './agent/rag-agent.initializer';

type AgentChangeListener = (agentId: string) => void;

export class ChatService {
  public getAgentId() {
    return this.agentId;
  }

  /**
   * Change dynamiquement l'agent utilisé pour le chat
   */
  public setAgent(agentId: string) {
    this.agentId = agentId;
    this.agentExecutor = null;
    // Persistance dans les settings
    if (this.settings && this.plugin) {
      this.settings.selectedChatAgentId = agentId;
      this.plugin.saveData(this.settings);
    }
    this.notifyAgentChange();
    // Ne pas réinitialiser l'historique ici pour conserver l'historique global
  }
  private agentExecutor: RunnableWithMessageHistory<{ input: string }, any> | null = null;
  private agentChangeListeners: AgentChangeListener[] = [];

  public onAgentChange(listener: AgentChangeListener) {
    this.agentChangeListeners.push(listener);
  }

  private notifyAgentChange() {
    for (const listener of this.agentChangeListeners) {
      listener(this.agentId);
    }
  }
  private messageHistory = new ChatMessageHistory();
  private initializing: Promise<void> | null = null;

  private agentId: string = RAG_AGENT_ID;
  private settings?: PluginSettings;

  constructor(
    private readonly agentFactory: ChatAgentFactory,
    private plugin: KnowledgeManagerPlugin,
    private tracer: any = undefined
  ) {}

  async init() {
    this.settings = await this.plugin.loadData();
    this.agentId = this.settings?.selectedChatAgentId || RAG_AGENT_ID;
  }

  /**
   * Initialise l'agent LangChain via la factory (LLM, tools, prompt, agent, executor)
   */
  private async initAgent(): Promise<void> {
    if (this.agentExecutor) return;
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      this.agentExecutor = await this.agentFactory.createAgentExecutor(this.agentId, this.messageHistory);
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


