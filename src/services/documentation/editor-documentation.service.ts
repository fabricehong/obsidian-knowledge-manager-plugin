import { App, MarkdownView, Notice } from "obsidian";
import { DocumentStructureService } from "../document/document-structure.service";
import { DocumentationService } from "./documentation.service";
import { HeaderNode, RootNode } from "../../models/interfaces";
import { LoadingModal } from "../../ui/loading.modal";
import { MindmapInputModal } from "../../ui/mindmap-input.modal";

export class EditorDocumentationService {
    constructor(
        private app: App,
        private documentStructureService: DocumentStructureService,
        private documentationService: DocumentationService
    ) {}

    async createDocumentation(
        markdownView: MarkdownView,
        headerContainingTranscript: string
    ): Promise<void> {
        try {
            const file = markdownView.file;
            if (!file) {
                new Notice('No file is currently open');
                return;
            }

            const content = await this.app.vault.read(file);
            const metadata = this.app.metadataCache.getFileCache(file);
            const doc = this.documentStructureService.buildHeaderTree(metadata!, content);

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
                // Get mindmap from user
                await new Promise<void>((resolve) => {
                    new MindmapInputModal(this.app, async (mindmap: string) => {
                        try {
                            if (isCancelled) {
                                resolve();
                                return;
                            }

                            // Generate documentation
                            const documentation = await this.documentationService.createDocumentation(
                                transcriptContent,
                                mindmap
                            );

                            // Add documentation as a new section
                            const header = {
                                level: 1,
                                heading: "Résumé",
                                content: documentation,
                                children: []
                            };
                            doc.children.unshift(header);

                            // Save changes
                            const newContent = this.documentStructureService.renderToMarkdown(doc);
                            await this.app.vault.modify(file, newContent);

                            new Notice('Documentation has been created successfully!');
                        } catch (error) {
                            console.error('Error creating documentation:', error);
                            new Notice('Error creating documentation. Check the console for details.');
                        } finally {
                            loadingModal.forceClose();
                            resolve();
                        }
                    }).open();
                });
            } finally {
                if (!isCancelled) {
                    loadingModal.close();
                }
            }
        } catch (error) {
            console.error('Error in createDocumentation:', error);
            new Notice('Failed to create documentation');
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
