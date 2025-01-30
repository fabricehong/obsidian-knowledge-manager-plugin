import { App, MarkdownView, Notice } from 'obsidian';
import { DocumentStructureService } from '../document/document-structure.service';

/**
 * Service responsible for copying transcript content to clipboard.
 * 
 * This service handles:
 * - Extracting transcript content from the active document
 * - Copying the content to the system clipboard
 * - Providing user feedback via notifications
 * 
 * @since 1.0.0
 */
export class EditorTranscriptCopyService {
    constructor(
        private app: App,
        private documentStructureService: DocumentStructureService,
        private headerContainingTranscript: string
    ) {}

    /**
     * Copy transcript content to clipboard from the current document.
     * 
     * @param markdownView The active markdown view containing the transcript
     * @throws Error if transcript section is not found or clipboard operation fails
     */
    async copyTranscript(markdownView: MarkdownView): Promise<void> {
        try {
            // Build the header tree
            const headerTree = await this.documentStructureService.buildHeaderTree(
                this.app,
                markdownView.file
            );

            // Find the transcript section
            const transcriptNode = this.documentStructureService.findFirstNodeMatchingHeading(
                headerTree.root,
                this.headerContainingTranscript
            );

            if (!transcriptNode) {
                throw new Error(`Section "${this.headerContainingTranscript}" non trouvée`);
            }

            // Copy to clipboard
            await navigator.clipboard.writeText(transcriptNode.content);
            
            // Show success notification
            new Notice('Transcript copié dans le presse-papiers');
        } catch (error) {
            console.error('Erreur lors de la copie du transcript:', error);
            new Notice(`Erreur: ${error.message}`);
            throw error;
        }
    }
}
