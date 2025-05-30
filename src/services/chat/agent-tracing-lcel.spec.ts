import { ChatOpenAI } from "@langchain/openai";
// -----------------------------------------------------------------------------
// CONFIGURATION & ENVIRONNEMENT (simulerait config.ts)
// -----------------------------------------------------------------------------
const OPENAI_API_KEY = ""; // à remplir
const LANGCHAIN_API_KEY = ""; // à remplir
const LANGCHAIN_PROJECT = "";
const LANGCHAIN_TRACING_V2 = "true";
process.env.OPENAI_API_KEY = OPENAI_API_KEY;
process.env.LANGCHAIN_TRACING_V2 = LANGCHAIN_TRACING_V2;

// -----------------------------------------------------------------------------
// SERVICE DE RECHERCHE (simulerait services/fake-search.service.ts)
// -----------------------------------------------------------------------------
const fakeSearchService = {
  async search(query: string, maxResults: number) {
    return [
      { title: "Doc 1", content: "LangChain JS pour orchestrer des LLMs." },
      { title: "Doc 2", content: "LangSmith trace les runs et prompts." }
    ];
  }
};

// -----------------------------------------------------------------------------
// TOOL : PROMPT, PARSER, CHAIN, TOOL (simulerait tools/search-vault.tool.ts)
// -----------------------------------------------------------------------------
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { StructuredOutputParser } from "langchain/output_parsers";

const searchToolOutputSchema = z.object({
  summary: z.string(),
  keywords: z.array(z.string())
});
const searchToolOutputParser = StructuredOutputParser.fromZodSchema(searchToolOutputSchema);

const searchToolPrompt = ChatPromptTemplate.fromMessages([
  ["system", "Tu es un assistant de test. Tu dois synthétiser des résultats de recherche pour l'utilisateur."],
  ["human", "{instructions}\n\nTa tâche : À partir des résultats suivants, synthétise les infos pertinentes pour : \"{originalQuery}\"\nRésultats :\n{rawResults}"]
]);

const searchToolLLM = new ChatOpenAI({
  temperature: 0,
  modelName: "gpt-3.5-turbo"
});

const searchToolChain = searchToolPrompt
  .pipe(searchToolLLM)
  .pipe(searchToolOutputParser);

const searchVaultTool = tool(
  async (input: { query: string }, run_manager) => {
    const rawResults = await fakeSearchService.search(input.query, 2);
    const instructions = searchToolOutputParser.getFormatInstructions();
    const processed = await searchToolChain.invoke(
      {
        instructions,
        originalQuery: input.query,
        rawResults: JSON.stringify(rawResults, null, 2)
      },
      { callbacks: run_manager?.callbacks }
    );
    return JSON.stringify(processed);
  },
  {
    name: "search_vault",
    description: "Recherche factice pour test tracing LCEL",
    schema: z.object({ query: z.string() })
  }
);

// -----------------------------------------------------------------------------
// AGENT : PROMPT, LLM, FACTORY (simulerait agents/agent.ts)
// -----------------------------------------------------------------------------
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

const agentPrompt = ChatPromptTemplate.fromMessages([
  ["system", "Tu es un assistant de test."],
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad")
]);

const agentLLM = new ChatOpenAI({
  temperature: 0,
  modelName: "gpt-3.5-turbo"
});

async function createAgentExecutor() {
  const agent = await createToolCallingAgent({
    llm: agentLLM,
    tools: [searchVaultTool],
    prompt: agentPrompt
  });
  return new AgentExecutor({ agent, tools: [searchVaultTool] });
}

// -----------------------------------------------------------------------------
// TRACING (simulerait tracing/langsmith-tracer.ts)
// -----------------------------------------------------------------------------
import { Client } from "langsmith";
import { LangChainTracer } from 'langchain/callbacks';

function getTracer() {
  const client = new Client({ apiKey: LANGCHAIN_API_KEY });
  return new LangChainTracer({ projectName: LANGCHAIN_PROJECT, client });
}

// -----------------------------------------------------------------------------
// TESTS D'INTEGRATION (ce qui reste dans ce fichier)
// -----------------------------------------------------------------------------
describe("Agent LCEL tracing integration", () => {
  it("trace l'appel imbriqué LLM secondaire via tool", async () => {
    const agentExecutor = await createAgentExecutor();
    const tracer = getTracer();
    const result = await agentExecutor.invoke(
      { input: "Synthétise les usages de LangChain et LangSmith" },
      { callbacks: [tracer] }
    );
    expect(result).toBeTruthy();
    // Vérifie manuellement dans LangSmith que le prompt du LLM secondaire apparaît
  });
});

/*
  --- ORGANISATION CONSEILLÉE POUR UN VRAI PROJET ---
  - config.ts              → Toutes les constantes d'env et clés API
  - services/search.ts     → Le service de recherche (factice ou réel)
  - tools/search-tool.ts   → Toute la logique du tool (prompt, parser, chaîne, tool)
  - agents/agent.ts        → Prompt, LLM, factory d'agent
  - tracing/langsmith.ts   → getTracer() et config tracing
  - tests/agent-tracing.spec.ts → Les tests d'intégration
*/
