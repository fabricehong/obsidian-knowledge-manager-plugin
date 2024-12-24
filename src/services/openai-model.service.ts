import { ChatOpenAI } from "@langchain/openai";
import { Notice } from "obsidian";

export class OpenAIModelService {
    private model: ChatOpenAI | undefined;
    private apiKey: string | undefined;

    initialize(apiKey: string | undefined) {
        this.apiKey = apiKey;
        
        if (!this.apiKey) {
            this.model = undefined;
            return;
        }

        this.model = new ChatOpenAI({
            openAIApiKey: this.apiKey,
            temperature: 0,
            modelName: "gpt-4o-mini",
        });
    }

    getModel(): ChatOpenAI {
        if (!this.apiKey) {
            new Notice('OpenAI API key not set. Please set it in the Knowledge Manager plugin settings.');
            throw new Error('OpenAI API key not set');
        }

        if (!this.model) {
            new Notice('OpenAI model not properly initialized. Please check your API key in the settings.');
            throw new Error('OpenAI model not properly initialized');
        }

        return this.model;
    }
}
