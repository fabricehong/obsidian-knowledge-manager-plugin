import { IChatAgentInitializer } from "./chat-agent-initializer.interface";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { AGENT_INPUT_KEY, AGENT_HISTORY_KEY } from "./agent-keys.constants";
import { ChatMessageHistory } from "langchain/memory";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

// Identifiant unique de l'agent
export const SLOGAN_AGENT_ID = "slogan-yogurt-agent";

export class SloganAgentInitializer implements IChatAgentInitializer {
  constructor(private llm: BaseChatModel) {}

  getId(): string {
    return SLOGAN_AGENT_ID;
  }

  async initialize(messageHistory: ChatMessageHistory): Promise<RunnableWithMessageHistory<{ input: string }, any>> {
    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "Tu es un expert en marketing. Génère un slogan accrocheur pour un yaourt à base du fruit suivant : {input}. Réponds uniquement par le slogan."
      ],
      new MessagesPlaceholder(AGENT_HISTORY_KEY),
      ["human", "{input}"]
    ]);

    // Simple agent: LLM avec le prompt, puis transforme en { output: ... }
    const { RunnableLambda } = await import("@langchain/core/runnables");
    const agent = prompt
      .pipe(this.llm)
      .pipe(RunnableLambda.from(async (slogan) => {
        console.warn("[SloganAgent] Slogan généré:", slogan, "type:", typeof slogan);
        const text = typeof slogan === "string" ? slogan : slogan?.content ?? "";
        return { output: text };
      }));

    // Ajoute le support de l'historique partagé
    const agentWithHistory = new RunnableWithMessageHistory({
      runnable: agent,
      getMessageHistory: (_sessionId) => messageHistory,
      inputMessagesKey: AGENT_INPUT_KEY,
      historyMessagesKey: AGENT_HISTORY_KEY
    });
    return agentWithHistory;
  }
}
