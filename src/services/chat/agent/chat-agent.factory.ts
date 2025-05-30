// -----------------------------------------------------------------------------
// AGENT FACTORY (simulerait agents/chat-agent.factory.ts)
// -----------------------------------------------------------------------------
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { createSearchVaultTool } from '../tools/search-vault.tool';

/**
 * Factory pour créer un AgentExecutor LangChain pour le chat
 * Structure LCEL :
 * - Prompt agent (ChatPromptTemplate)
 * - Tool(s) (issus d'une factory)
 * - Agent (createToolCallingAgent)
 * - Executor (AgentExecutor)
 */
export async function createChatAgentExecutor({
  llm,
  chatSemanticSearchService,
  processingLLM
}: {
  llm: any;
  chatSemanticSearchService: any;
  processingLLM: any;
}): Promise<AgentExecutor> {
  // ---------------------------------------------------------------------------
  // TOOL (injecté, voir tools/search-vault.tool.ts)
  // ---------------------------------------------------------------------------
  const { tool: intelligentSearchTool } = createSearchVaultTool({
    chatSemanticSearchService,
    processingLLM
  });
  const tools = [intelligentSearchTool];

  // ---------------------------------------------------------------------------
  // PROMPT AGENT LCEL
  // ---------------------------------------------------------------------------
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "Tu es un assistant Obsidian expert."],
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad")
  ]);

  // ---------------------------------------------------------------------------
  // AGENT + EXECUTOR
  // ---------------------------------------------------------------------------
  const agent = await createToolCallingAgent({ llm, tools, prompt });
  return new AgentExecutor({ agent, tools });
}

/*
  --- ORGANISATION CONSEILLÉE POUR UN VRAI PROJET ---
  - tools/search-vault.tool.ts   → Toute la logique du tool (prompt, parser, chaîne, tool)
  - agents/chat-agent.factory.ts → Prompt, LLM, factory d'agent
*/
