import { ChatSemanticSearchService } from "../semantic/search/ChatSemanticSearchService";

export interface ChatResponse {
  role: 'user' | 'assistant';
  content: string;
}

import { ChatOpenAI } from "@langchain/openai";

import { createOpenAIFunctionsAgent, AgentExecutor } from "langchain/agents";
import { pull } from "langchain/hub";
import type { ChatPromptTemplate } from "@langchain/core/prompts";
import { DynamicTool } from "@langchain/core/tools";

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
      // 2. Tool: recherche dans la vault (RAG)
      const searchVaultTool = new DynamicTool({
        name: "search_vault",
        description: "Recherche des informations pertinentes dans la base de connaissances Obsidian (RAG)",
        func: async (input: string) => {
          const results = await this.chatSemanticSearchService.search(input, 4);
          // Vérifie que chaque résultat a bien la propriété chunk.pageContent
          return results.map(r => JSON.stringify(r)).join("\n---\n");
        },
      });
      const tools = [searchVaultTool];
      // 3. Prompt recommandé par LangChain
      const prompt: ChatPromptTemplate = await pull<ChatPromptTemplate>("hwchase17/openai-functions-agent");
      // 4. Agent LangChain
      const agent = await createOpenAIFunctionsAgent({ llm, tools, prompt });
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
    console.log('[LangSmith] Callbacks utilisés', callbacks);
    const result = await this.agentExecutor.invoke({ input: message }, callbacks ? { callbacks } : undefined);
    return {
      role: 'assistant',
      content: result.output ?? '',
    };
  }
}


