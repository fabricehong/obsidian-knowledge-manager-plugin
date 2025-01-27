import { App, MarkdownView, Notice } from "obsidian";
import { DocumentStructureService } from "../document/document-structure.service";
import { KnowledgeDiffusionService } from "./knowledge-diffusion.service";

export class EditorKnowledgeDiffusionService {
    constructor(
        private app: App,
        private documentStructureService: DocumentStructureService,
        private knowledgeDiffusionService: KnowledgeDiffusionService
    ) {}

    async diffuseCurrentNote(markdownView: MarkdownView): Promise<void> {
        const editor = markdownView.editor;
        const content = editor.getValue();
        const file = markdownView.file;
        if (!file) {
            new Notice('No file is currently open');
            return;
        }
        
        try {
            new Notice('Diffusing note...');
            const headerTree = await this.documentStructureService.buildHeaderTree(this.app, file);
            const diffusionPlans = this.knowledgeDiffusionService.buildDiffusionRepresentation(headerTree);

            if (diffusionPlans.length === 0) {
                new Notice('No diffusion references found in the note');
                return;
            }

            // Execute the diffusion plans
            await this.knowledgeDiffusionService.diffuseKnowledge(
                diffusionPlans,
                this.app.vault
            );

            console.log('Diffusion completed:', diffusionPlans);
            new Notice('Note has been diffused! Check the console for details.');
        } catch (error) {
            console.error('Error during diffusion:', error);
            new Notice(`Error during diffusion: ${error.message}`); 
        }
    }
}
