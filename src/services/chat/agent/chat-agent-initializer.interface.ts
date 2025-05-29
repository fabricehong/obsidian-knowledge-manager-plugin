import { RunnableWithMessageHistory } from "@langchain/core/runnables";

export interface IChatAgentInitializer {
  getId(): string;
  initialize(): Promise<RunnableWithMessageHistory<{ input: string }, any>>;
}
