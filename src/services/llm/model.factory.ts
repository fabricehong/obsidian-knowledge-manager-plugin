import { ChatOpenAI } from "@langchain/openai";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { LLMOrganization } from "../../settings/settings";

export class ModelFactory {
    static createModel(organization: LLMOrganization, modelName: string): BaseChatModel {
        switch (organization.name.toLowerCase()) {
            case 'openai':
                return new ChatOpenAI({
                    openAIApiKey: organization.apiKey,
                    modelName: modelName,
                    temperature: 0,
                });
            case 'deepseek':
                return new ChatDeepSeek({
                    apiKey: organization.apiKey,
                    modelName: modelName,
                    temperature: 0,
                });
            case 'groq':
                return new ChatGroq({
                    apiKey: organization.apiKey,
                    modelName: modelName,
                    temperature: 0,
                });
            case 'google':
                return new ChatGoogleGenerativeAI({
                    apiKey: organization.apiKey,
                    modelName: modelName,
                    temperature: 0,
                });
            default:
                throw new Error(`Unsupported organization: ${organization.name}`);
        }
    }
}
