import OpenAI from "openai";
import { Notice } from "obsidian";
import { AICompletionService } from "../interfaces/ai-completion.interface";

export class OpenAICompletionService implements AICompletionService {
    private client: OpenAI | undefined;
    private debug: boolean = false;

    constructor(debug: boolean = false) {
        this.debug = debug;
    }

    initialize(apiKey: string): void {
        if (!apiKey || apiKey.trim() === '') {
            this.client = undefined;
            return;
        }

        this.client = new OpenAI({
            apiKey: apiKey,
            timeout: 60000, // 60 secondes de timeout
            dangerouslyAllowBrowser: true
        });
    }

    private log(...args: any[]) {
        if (this.debug) {
            console.log(...args);
        }
    }

    private validateClient(): void {
        if (!this.client) {
            new Notice('OpenAI client not initialized. Please check your API key in the settings.');
            throw new Error('OpenAI client not initialized');
        }
    }

    async generateStructuredResponse<T>(
        messages: Array<{role: 'system' | 'user' | 'assistant', content: string}>,
    ): Promise<T> {
        this.validateClient();

        try {
            const completion = await this.client!.chat.completions.create({
                model: "gpt-4o",
                messages: messages,
                temperature: 0,
                response_format: { type: "json_object" }
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('No response from OpenAI');
            }

            // Parse et valide la réponse selon le schéma
            const parsedResponse = JSON.parse(response);
            return parsedResponse as T;
        } catch (error) {
            console.error("Error generating structured response:", error);
            throw error;
        }
    }

    async generateTextResponse(
        messages: Array<{role: 'system' | 'user' | 'assistant', content: string}>
    ): Promise<string> {
        this.validateClient();

        try {
            const completion = await this.client!.chat.completions.create({
                model: "gpt-4o",
                messages: messages,
                temperature: 0
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('No response from OpenAI');
            }

            return response;
        } catch (error) {
            console.error("Error generating text response:", error);
            throw error;
        }
    }
}
