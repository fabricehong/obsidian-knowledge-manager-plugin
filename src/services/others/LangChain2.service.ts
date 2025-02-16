import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

export class LangChain2Service {
    private model: ChatOpenAI | undefined;
    private chain: RunnableSequence | undefined;
    private apiKey: string | undefined;

    async initialize(apiKey: string | undefined, modelName: string, temperature: number, promptTemplate: string) {
        this.apiKey = apiKey;

        if (!this.apiKey) {
            this.model = undefined;
            this.chain = undefined;
            return;
        }

        this.model = new ChatOpenAI({
            openAIApiKey: this.apiKey,
            temperature: temperature,
            modelName: modelName,
        });

        const prompt = PromptTemplate.fromTemplate(promptTemplate);

        this.chain = RunnableSequence.from([
            prompt,
            this.model,
            new StringOutputParser(),
        ]);
    }

    async run(text: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not set');
        }

        if (!this.chain) {
            throw new Error('LangChain not properly initialized');
        }

        return await this.chain.invoke({
            text
        });
    }
}
