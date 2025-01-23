import { ChatOpenAI } from "@langchain/openai";
import { Notice } from "obsidian";

export class OpenAIModelService {
    private model: ChatOpenAI | undefined;
    private apiKey: string | undefined;

    initialize(apiKey: string | undefined) {
        if (apiKey === this.apiKey) {
            return;
        }

        console.log(" Initialisation du modèle OpenAI...");
        this.apiKey = apiKey;
        
        if (!this.apiKey) {
            this.model = undefined;
            return;
        }

        this.model = new ChatOpenAI({
            openAIApiKey: this.apiKey,
            temperature: 0,
            modelName: "gpt-4o",
            timeout: 120000, // 60 secondes de timeout
            callbacks: [
                {
                    handleLLMStart: async (llm: any, prompts: string[]) => {
                        console.log(" OpenAI - Début de l'appel avec prompt:", prompts);
                    },
                    handleLLMEnd: async (output: any) => {
                        console.log(" OpenAI - Fin de l'appel, réponse:", output);
                    },
                    handleLLMError: async (err: Error) => {
                        console.error(" OpenAI - Erreur lors de l'appel:", err);
                    }
                }
            ]
        });
        console.log(" Modèle OpenAI initialisé avec timeout de 60s");
    }

    getModel(): ChatOpenAI {
        if (!this.apiKey) {
            new Notice('OpenAI API key not set. Please set it in the Knowledge Manager plugin settings.');
            throw new Error('OpenAI API key not set');
        }

        if (!this.model) {
            console.error(" Le modèle OpenAI n'est pas initialisé");
            new Notice('OpenAI model not properly initialized. Please check your API key in the settings.');
            throw new Error('OpenAI model not properly initialized');
        }

        return this.model;
    }
}
