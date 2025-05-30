import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatMessageHistory } from "langchain/memory";

export interface IChatAgentInitializer {
  getId(): string;
  initialize(messageHistory: ChatMessageHistory): Promise<RunnableWithMessageHistory<{ input: string }, any>>;
}
