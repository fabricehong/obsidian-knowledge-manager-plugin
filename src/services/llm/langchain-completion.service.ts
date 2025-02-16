import { Notice } from "obsidian";
import { AICompletionService, LLMContext } from "../interfaces/ai-completion.interface";
import { ModelFactory } from "./model.factory";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { z } from 'zod';

export class LangChainCompletionService implements AICompletionService {
    private model: BaseChatModel | undefined;
    private readonly debug: boolean;
    private readonly currentModel: string;

    constructor(context: LLMContext, debug: boolean = false) {
        this.debug = debug;
        this.currentModel = context.configuration.model;

        if (!context.organization.apiKey || context.organization.apiKey.trim() === '') {
            this.model = undefined;
            return;
        }

        try {
            console.log(`organization: ${context.organization.name}`);
            this.model = ModelFactory.createModel(context.organization, this.currentModel);
        } catch (error) {
            console.error('Error initializing model:', error);
            this.model = undefined;
        }
    }

    private log(...args: any[]) {
        if (this.debug) {
            console.log(...args);
        }
    }

    private validateModel(): void {
        if (!this.model) {
            new Notice('LLM model not initialized. Please check your API key in the settings.');
            throw new Error('LLM model not initialized');
        }
    }

    private convertMessages(messages: Array<{role: 'system' | 'user' | 'assistant', content: string}>) {
        return messages.map(msg => {
            switch (msg.role) {
                case 'system':
                    return new SystemMessage(msg.content);
                case 'user':
                    return new HumanMessage(msg.content);
                case 'assistant':
                    return new AIMessage(msg.content);
                default:
                    throw new Error(`Unsupported message role: ${msg.role}`);
            }
        });
    }

    /**
     * @deprecated Utiliser generateStructuredResponseWithSchema à la place
     */
    async generateStructuredResponse<T>(
        messages: Array<{role: 'system' | 'user' | 'assistant', content: string}>,
    ): Promise<T> {
        this.validateModel();

        try {
            const langchainMessages = this.convertMessages(messages);
            this.log('Messages:', langchainMessages);
            const result = await this.model!.invoke(langchainMessages);
            const content = result.content.toString();
            
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

    async generateStructuredResponseWithSchema<T extends Record<string, any>>(
        messages: Array<{role: 'system' | 'user' | 'assistant', content: string}>,
        schema: z.ZodSchema<T>
    ): Promise<T> {
        this.validateModel();

        try {
            // Convertir les messages au format LangChain
            const langchainMessages = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Utiliser withStructuredOutput avec le type générique
            const modelWithStructure = this.model!.withStructuredOutput<T>(schema);
            const result = await modelWithStructure.invoke(langchainMessages);

            this.log('Structured Response:', result);

            return result;
        } catch (error) {
            console.error('Error generating structured response with schema:', error);
            throw error;
        }
    }

    async generateTextResponse(
        messages: Array<{role: 'system' | 'user' | 'assistant', content: string}>
    ): Promise<string> {
        this.validateModel();

        try {
            const langchainMessages = this.convertMessages(messages);
            const result = await this.model!.invoke(langchainMessages);
            const content = result.content.toString();

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
