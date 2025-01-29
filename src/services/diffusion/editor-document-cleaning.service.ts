import { App, MarkdownView, Notice } from "obsidian";
import { DocumentStructureService } from "../document/document-structure.service";
import { RootNode } from "../../models/interfaces";
import { DocumentCleaningService } from "./document-cleaning.service";

export class EditorDocumentCleaningService {
    constructor(
        private app: App,
        private documentStructureService: DocumentStructureService,
        private documentCleaningService: DocumentCleaningService
    ) {}

    async cleanReferenceContent(view: MarkdownView): Promise<void> {
        try {
            new Notice('Cleaning references content...');

            const editor = view.editor;
            const content = editor.getValue();
            const file = view.file;

            if (!file) {
                new Notice('No file is currently open');
                return;
            }

            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache) {
                new Notice('No cache found for the current file');
                return;
            }

            // Build the document tree using document structure service
            const rootNode = await this.documentStructureService.buildHeaderTree(this.app, file);

            // Clean the content using document cleaning service
            const cleanedRootNode = await this.documentCleaningService.cleanNode(rootNode.root) as RootNode;

            // Convert back to markdown
            const cleanedContent = this.documentStructureService.renderToMarkdown(cleanedRootNode);

            // Update the editor with the cleaned content
            editor.setValue(cleanedContent);

            new Notice('References content has been removed');
        } catch (error) {
            console.error('Error while removing references:', error);
            new Notice(`Error while removing references: ${error.message}`);
        }
    }
}
