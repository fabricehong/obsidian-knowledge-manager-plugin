import OpenAI from "openai";
import { Notice } from "obsidian";
import { LLMConfiguration, LLMOrganization } from "../../settings/settings";
import { AICompletionService, LLMContext } from "@llm-utils/services/interfaces/ai-completion.interface";
import { ZodType } from "zod";

export interface LLMConfig {
    organization: LLMOrganization;
    configuration: {
        id: string;
        name: string;
        model: string;
    };
}

export class LLMCompletionService implements AICompletionService {
    private client: OpenAI | undefined;
    private readonly debug: boolean;
    private readonly currentModel: string;

    constructor(context: LLMContext, debug: boolean = false) {
        this.debug = debug;
        this.currentModel = context.configuration.model;

        if (!context.organization.apiKey || context.organization.apiKey.trim() === '') {
            this.client = undefined;
            return;
        }

        this.client = new OpenAI({
            apiKey: context.organization.apiKey,
            baseURL: context.organization.baseUrl || undefined,
            timeout: 60000,
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
            new Notice('LLM client not initialized. Please check your API key in the settings.');
            throw new Error('LLM client not initialized');
        }
    }

    async generateStructuredResponse<T>(
        messages: Array<{role: 'system' | 'user' | 'assistant', content: string}>,
    ): Promise<T> {
        this.validateClient();

        try {
            const completion = await this.client!.chat.completions.create({
                model: this.currentModel,
                messages: messages,
                temperature: 0,
                response_format: { type: "json_object" }
            });

            const content = completion.choices[0].message.content;
            if (!content) {
                throw new Error('No content in response');
            }

            this.log('Response:', content);

            return JSON.parse(content) as T;
        } catch (error) {
            console.error('Error generating structured response:', error);
            throw error;
        }
    }

    generateStructuredResponseWithSchema<T extends Record<string, any>>(messages: Array<{ role: "system" | "user" | "assistant"; content: string; }>, schema: ZodType<T>): Promise<T> {
        throw new Error("Method not implemented.");
    }

    async generateTextResponse(
        messages: Array<{role: 'system' | 'user' | 'assistant', content: string}>
    ): Promise<string> {
        this.validateClient();

        try {
            const completion = await this.client!.chat.completions.create({
                model: this.currentModel,
                messages: messages,
                temperature: 0
            });

            const content = completion.choices[0].message.content;
            if (!content) {
                throw new Error('No content in response');
            }

            this.log('Response:', content);

            return content;
        } catch (error) {
            console.error('Error generating text response:', error);
            throw error;
        }
    }

}
