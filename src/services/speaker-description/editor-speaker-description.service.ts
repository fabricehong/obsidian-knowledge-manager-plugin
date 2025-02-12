import { App, MarkdownView, Notice } from "obsidian";
import { DocumentStructureService } from "../document/document-structure.service";
import { SpeakerDescriptionService } from "./speaker-description.service";
import { LoadingModal } from "../../ui/loading.modal";

export class EditorSpeakerDescriptionService {
    constructor(
        private app: App,
        private documentStructureService: DocumentStructureService,
        private speakerDescriptionService: SpeakerDescriptionService
    ) {}

    async describeSpeakers(
        markdownView: MarkdownView,
        headerContainingTranscript: string,
        speakerDescriptionHeader: string
    ): Promise<void> {
        if (!markdownView.file) {
            new Notice('No active file');
            return;
        }

        try {
            const doc = await this.documentStructureService.buildHeaderTree(this.app, markdownView.file);

            // Get transcript content
            const transcriptContent = this.getTranscriptContent(doc.root, headerContainingTranscript);
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
                // Generate speaker descriptions
                const descriptions = await this.speakerDescriptionService.describeSpeakers(transcriptContent);

                if (isCancelled) {
                    new Notice('Operation cancelled');
                    return;
                }

                // Add descriptions as a new section
                const header = {
                    level: 1,
                    heading: speakerDescriptionHeader,
                    content: descriptions,
                    children: []
                };
                doc.root.children.unshift(header);

                // Save changes
                const newContent = this.documentStructureService.renderToMarkdown(doc.root);
                await this.app.vault.modify(markdownView.file, newContent);

                new Notice('Speaker descriptions have been created successfully!');
            } catch (error) {
                console.error('Error describing speakers:', error);
                new Notice('Error describing speakers. Check the console for details.');
            } finally {
                loadingModal.forceClose();
            }
        } catch (error) {
            console.error('Error in describeSpeakers:', error);
            new Notice('Error in describeSpeakers. Check the console for details.');
        }
    }

    private getTranscriptContent(doc: any, headerContainingTranscript: string): string | null {
        const transcriptNode = this.documentStructureService.findFirstNodeMatchingHeading(doc, headerContainingTranscript);
        if (!transcriptNode) {
            new Notice('No transcript section found');
            return null;
        }
        return transcriptNode.content;
    }
}
