import { App, MarkdownView, Notice } from "obsidian";
import { DocumentStructureService } from "../document/document-structure.service";
import { ConversationTopicsService } from "./conversation-topics.service";
import { HeaderNode, RootNode } from "../../models/interfaces";
import { LoadingModal } from "../../ui/loading.modal";

export class EditorConversationTopicsService {
    constructor(
        private app: App,
        private documentStructureService: DocumentStructureService,
        private conversationTopicsService: ConversationTopicsService
    ) {}

    async listTopics(
        markdownView: MarkdownView,
        headerContainingTranscript: string
    ): Promise<void> {
        try {
            const doc = await this.documentStructureService.buildHeaderTree(this.app, markdownView.file);

            // Get transcript content
            const transcriptContent = this.getTranscriptContent(doc, headerContainingTranscript);
            if (!transcriptContent) {
                return;
            }

            // Show loading modal
            let isCancelled = false;
            const loadingModal = new LoadingModal(this.app, () => {
                isCancelled = true;
            });
            loadingModal.open();

            try {
                // Generate topics list
                const topics = await this.conversationTopicsService.listTopics(transcriptContent);

                if (isCancelled) {
                    new Notice('Operation cancelled');
                    return;
                }

                // Add topics as a new section
                const header = {
                    level: 1,
                    heading: "Sujets",
                    content: topics,
                    children: []
                };
                doc.children.unshift(header);

                // Save changes
                const newContent = this.documentStructureService.renderToMarkdown(doc);
                await this.app.vault.modify(file, newContent);

                new Notice('Topics list has been created successfully!');
            } catch (error) {
                console.error('Error listing topics:', error);
                new Notice('Error listing topics. Check the console for details.');
            } finally {
                loadingModal.forceClose();
            }
        } catch (error) {
            console.error('Error in listConversationTopics:', error);
            new Notice('Error in listConversationTopics. Check the console for details.');
        }
    }

    private getTranscriptContent(doc: RootNode, headerContainingTranscript: string): string | null {
        const transcriptNode = this.documentStructureService.findFirstNodeMatchingHeading(doc, headerContainingTranscript);
        if (!transcriptNode) {
            new Notice('No transcript section found');
            return null;
        }
        return transcriptNode.content;
    }
}
