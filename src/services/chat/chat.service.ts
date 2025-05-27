import { ChatSemanticSearchService } from "../semantic/search/ChatSemanticSearchService";

export interface ChatResponse {
  role: 'user' | 'assistant';
  content: string;
}

import { ChatOpenAI } from "@langchain/openai";

import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export class ChatService {
  private agentExecutor: AgentExecutor | null = null;
  private initializing: Promise<void> | null = null;

  constructor(
    private readonly chatSemanticSearchService: ChatSemanticSearchService,
    private readonly openAIApiKey: string,
    private tracer?: any
  ) {}

  /**
   * Initialise l'agent LangChain (LLM, tools, prompt, agent, executor)
   */
  private async initAgent(): Promise<void> {
    if (this.agentExecutor) return;
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      // 1. LLM
      const llm = new ChatOpenAI({ model: "gpt-3.5-turbo", temperature: 0, openAIApiKey: this.openAIApiKey });
      // 2. Tool robuste avec schéma Zod et gestion d'erreur
      const searchVaultTool = tool(
        async ({ query }: { query: string }) => {
          try {
            const results = await this.chatSemanticSearchService.search(query, 4);
            return results.map(r => JSON.stringify(r)).join("\n---\n");
          } catch (e) {
            console.error('[search_vault] Erreur:', e);
            return "Erreur lors de la recherche.";
          }
        },
        {
          name: "search_vault",
          description: "Recherche des informations pertinentes dans la base de connaissances Obsidian (RAG)",
          schema: z.object({ query: z.string() }),
        }
      );
      const tools = [searchVaultTool];
      // 3. Prompt avec agent_scratchpad
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", "Tu es un assistant Obsidian expert."],
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad")
      ]);
      // 4. Agent tool-calling
      const agent = await createToolCallingAgent({ llm, tools, prompt });
      // 5. Executor
      this.agentExecutor = new AgentExecutor({ agent, tools });
    })();
    await this.initializing;
    this.initializing = null;
  }

  /**
   * Utilise l'agent pour répondre à un message utilisateur (avec accès RAG)
   */
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
      console.log('[LangSmith] Callbacks utilisés', callbacks);
      const result = await this.agentExecutor.invoke(
        { input: message },
        callbacks ? { callbacks } : undefined
      );
      return {
        role: 'assistant',
        content: result.output ?? '',
      };
    } catch (e) {
      console.error('[ChatService] Erreur agentExecutor.invoke', e);
      return {
        role: 'assistant',
        content: "Erreur lors de la génération de la réponse.",
      };
    }
  }
}


