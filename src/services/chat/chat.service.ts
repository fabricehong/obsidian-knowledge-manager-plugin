import { App } from 'obsidian';
import { ChatSemanticSearchService } from "../semantic/search/ChatSemanticSearchService";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatMessageHistory } from "langchain/memory";
import { ChatMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

// Type UI pour l’historique panel (brut, pas LangChain)
export type PanelChatMessage = { role: 'user' | 'assistant', content: string };
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

  public async getMessageHistory(): Promise<PanelChatMessage[]> {
    if (typeof this.messageHistory.getMessages === 'function') {
      const baseMessages = await this.messageHistory.getMessages();
      // Conversion explicite BaseMessage -> ChatMessage
      return baseMessages.map((msg: any) => ({
        role: (msg.role ?? (typeof msg._getType === 'function' ? msg._getType() : msg.type)) === 'ai' ? 'assistant' : 'user',
        content: msg.content ?? msg.text ?? ''
      }));
    }
    return [];
  }

  public setMessageHistory(messages: PanelChatMessage[]) {
    this.messageHistory.clear();
    for (const msg of messages) {
      if (typeof this.messageHistory.addMessage === 'function') {
        // Reconstruit un message compatible LangChain
        // On suppose que addMessage accepte { role, content }
        // On tente d’utiliser addMessage({ role, content }) si LangChain le supporte,
        // sinon il faudra utiliser les factories HumanMessage/AIMessage si besoin.
        if (msg.role === 'assistant') {
          this.messageHistory.addMessage(new AIMessage(msg.content));
        } else {
          this.messageHistory.addMessage(new HumanMessage(msg.content));
        }
      }
      // Pas d’accès à .messages qui est privé
    }
  }

  /**
   * Réinitialise l'historique des messages du chat
   */
  public clearMessageHistory() {
    this.messageHistory.clear();
  }
  private initializing: Promise<void> | null = null;

  private agentId: string = RAG_AGENT_ID;
  private settings?: PluginSettings;

  constructor(
    private readonly agentFactory: ChatAgentFactory,
    private plugin: KnowledgeManagerPlugin,
    private tracer: any = undefined
  ) {}

  /**
   * Retourne la liste des agents disponibles pour le chat
   */
  public getAvailableAgents(): string[] {
    return this.agentFactory.listAgents();
  }

  /**
   * Retourne l'instance d'Obsidian App
   */
  public getApp(): App {
    return this.plugin.app;
  }

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


