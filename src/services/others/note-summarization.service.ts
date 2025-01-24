import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { OpenAIModelService } from "../llm/openai-model.service";

export class NoteSummarizationService {
    private chain: RunnableSequence | undefined;

    constructor(private readonly openAIModelService: OpenAIModelService) {}

    private initializeChain() {
        const summarizePrompt = PromptTemplate.fromTemplate(
            `Summarize the following text in a concise way:
            
            {text}
            
            Summary:`
        );

        this.chain = RunnableSequence.from([
            summarizePrompt,
            this.openAIModelService.getModel(),
            new StringOutputParser(),
        ]);
    }

    async summarize(text: string): Promise<string> {
        if (!this.chain) {
            this.initializeChain();
        }

        return await this.chain!.invoke({
            text
        });
    }
}
