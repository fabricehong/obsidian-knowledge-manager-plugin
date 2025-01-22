import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { OpenAIModelService } from "../../llm/openai-model.service";

export interface FusionPart {
    breadcrumbs: string[];
    content: string;
}

export class ContentFusionService {
    private chain: RunnableSequence | undefined;

    constructor(private readonly openAIModelService: OpenAIModelService) {}

    private initializeChain() {
        const fusionPrompt = PromptTemplate.fromTemplate(this.buildFusionPrompt());

        this.chain = RunnableSequence.from([
            fusionPrompt,
            this.openAIModelService.getModel(),
            new StringOutputParser(),
        ]);
    }

    private buildFusionPrompt(): string {
        return `You are a knowledge integration expert specializing in creating clear, well-structured documentation. Your task is to thoughtfully integrate new knowledge into specific sections of an existing note, prioritizing the most recent information when conflicts arise.

EXISTING CONTENT:
----------------
{existingContent}

NEW KNOWLEDGE TO INTEGRATE:
-------------------------
{newParts}

INSTRUCTIONS:
------------
1. Analyze both contents for conflicts and updates:
   - Identify any contradictions between existing and new content
   - Treat new knowledge as more authoritative and up-to-date
   - Look for outdated information in the existing content

2. Handle contradictions:
   - When new knowledge contradicts existing content:
     * Replace the outdated information with the new content
     * Add a note about the update if the change is significant
     * Ensure surrounding context is updated to maintain consistency
   - Example: If existing text says "X is true" but new content states "X is false", 
     use the new information and update related statements

3. For each piece of new knowledge:
   - Consider its hierarchical context (given by breadcrumbs)
   - Identify where it best fits within the existing content
   - Override any conflicting existing information
   - Integrate it naturally, maintaining the flow of ideas

4. When integrating:
   - Preserve important information that doesn't conflict with new content
   - Remove or update any information that contradicts new knowledge
   - Maintain a logical flow
   - Keep the document's original structure where appropriate
   - Use the breadcrumb context to better understand and place the new content

5. Improve structure ONLY for sections being modified:
   - If a section becomes too long or dense after integration:
     * Break down that specific section into bullet points if it contains related items
     * Use numbered lists if the section contains sequential steps
     * Split the section into subsections with appropriate headers
   - Keep unaffected sections unchanged
   - Example: If adding knowledge to a paragraph makes it too long, only restructure that specific paragraph

6. Use markdown formatting in modified sections:
   - Headers (# to ######) for new subsections
   - Bold (**) for important new terms or concepts
   - Lists (- or 1.) to break down complex paragraphs
   - Keep paragraphs focused (3-5 sentences maximum)

7. The final text should:
   - Reflect the most up-to-date information (prioritizing new knowledge)
   - Preserve the original structure of unaffected sections
   - Have improved readability only in modified sections
   - Flow naturally between modified and unmodified parts
   - Not be outputted in a code block
   - Use appropriate whitespace around modified sections

OUTPUT:
-------
Provide the integrated document, prioritizing new knowledge where conflicts exist and restructuring only the sections where changes were made:`;
    }

    private formatNewParts(newParts: FusionPart[]): string {
        return newParts.map(part => {
            const context = part.breadcrumbs.length > 0 
                ? `Context: This content comes from a section with path: ${part.breadcrumbs.join(' > ')}\n`
                : '';
            return `${context}Content:
${part.content}
---`;
        }).join('\n\n');
    }

    async fuseContent(existingContent: string, newParts: FusionPart[]): Promise<string> {
        if (!this.chain) {
            this.initializeChain();
        }

        return await this.chain!.invoke({
            existingContent,
            newParts: this.formatNewParts(newParts)
        });
    }
}
