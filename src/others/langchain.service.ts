import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { Notice } from "obsidian";

export class LangChainService {
    private model: ChatOpenAI | undefined;
    private chain: RunnableSequence | undefined;
    private apiKey: string | undefined;

    initialize(apiKey: string | undefined) {
        this.apiKey = apiKey;
        
        if (!this.apiKey) {
            this.model = undefined;
            this.chain = undefined;
            return;
        }

        this.model = new ChatOpenAI({
            openAIApiKey: this.apiKey,
            temperature: 0,
            modelName: "gpt-4o-mini",
        });

        const summarizePrompt = PromptTemplate.fromTemplate(
            `Summarize the following text in a concise way:
            
            {text}
            
            Summary:`
        );

        this.chain = RunnableSequence.from([
            summarizePrompt,
            this.model,
            new StringOutputParser(),
        ]);
    }

    async summarize(text: string): Promise<string> {
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

    private buildFusionPrompt(existingContent: string, newParts: { breadcrumbs: string[], content: string }[]): string {
        return `You are a knowledge integration expert. Your task is to thoughtfully integrate new knowledge into an existing note while maintaining coherence and context.

EXISTING CONTENT:
----------------
{existingContent}

NEW KNOWLEDGE TO INTEGRATE:
-------------------------
${newParts.map(part => {
    const context = part.breadcrumbs.length > 0 
        ? `Context: This content comes from a section with path: ${part.breadcrumbs.join(' > ')}\n`
        : '';
    return `${context}Content:
${part.content}
---`;
}).join('\n\n')}

INSTRUCTIONS:
------------
1. Analyze both the existing content and the new knowledge to be integrated
2. For each piece of new knowledge:
   - Consider its hierarchical context (given by breadcrumbs)
   - Identify where it best fits within the existing content
   - Integrate it naturally, maintaining the flow of ideas
3. When integrating:
   - Preserve important information from both sources
   - Eliminate redundancy
   - Maintain a logical flow
   - Keep the document's original structure where appropriate
   - Use the breadcrumb context to better understand and place the new content
4. The final text should:
   - Be cohesive and well-organized
   - Read naturally as a single document
   - Preserve the markdown formatting

OUTPUT:
-------
Provide the complete integrated document, maintaining markdown formatting:`;
    }

    async fuseContent(existingContent: string, newParts: { breadcrumbs: string[], content: string }[]): Promise<string> {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not set');
        }

        if (!this.model) {
            throw new Error('LangChain model not properly initialized');
        }

        const fusionPrompt = PromptTemplate.fromTemplate(
            this.buildFusionPrompt(existingContent, newParts)
        );

        const fusionChain = RunnableSequence.from([
            fusionPrompt,
            this.model,
            new StringOutputParser(),
        ]);

        return await fusionChain.invoke({
            existingContent,
            newParts: JSON.stringify(newParts)
        });
    }
}
