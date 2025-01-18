import { MarkdownView } from "obsidian";
import { OpenAIModelService } from "../openai-model.service";
import { HumanMessage } from "@langchain/core/messages";
import { BaseMessage } from "@langchain/core/messages";
import { MessageContentText } from "@langchain/core/messages";

export class DocumentTranslationService {
    constructor(private openAIModelService: OpenAIModelService) {}

    async translateToItalian(markdownView: MarkdownView): Promise<void> {
        const editor = markdownView.editor;
        const content = editor.getValue();
        
        const prompt = `Translate the following text to Italian, maintaining all markdown formatting:

${content}`;

        try {
            const model = this.openAIModelService.getModel();
            const response = await model.invoke([new HumanMessage(prompt)]);
            const translatedContent = this.extractContent(response);
            editor.setValue(translatedContent);
        } catch (error) {
            console.error('Translation failed:', error);
            throw new Error('Failed to translate document');
        }
    }

    private extractContent(message: BaseMessage): string {
        if (typeof message.content === 'string') {
            return message.content;
        }
        if (Array.isArray(message.content)) {
            return message.content
                .filter((item): item is MessageContentText => 
                    typeof item === 'string' || 'text' in item
                )
                .map(item => typeof item === 'string' ? item : item.text)
                .join('');
        }
        return '';
    }
}
