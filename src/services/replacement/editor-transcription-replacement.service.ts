import { App, MarkdownView, Notice, TFile, Modal, ButtonComponent } from "obsidian";
import { ReplacementSpecs } from "../../models/interfaces";
import { ReplacementReport } from "../../models/interfaces";
import { DocumentStructureService } from "../document-structure.service";
import { TranscriptionReplacementService } from "./transcription-replacement.service";
import { YamlReplacementService } from "./yaml-replacement.service";
import { ReplacementReportModal } from '../../ui/replacement-report.modal';
import { YamlValidationError } from '../../models/errors';

export class EditorTranscriptionReplacementService {
    private documentStructureService: DocumentStructureService;
    private yamlReplacementService: YamlReplacementService;
    private transcriptionReplacementService: TranscriptionReplacementService;
    private app: App;

    constructor(
        app: App,
        documentStructureService: DocumentStructureService,
        yamlReplacementService: YamlReplacementService,
        transcriptionReplacementService: TranscriptionReplacementService
    ) {
        this.app = app;
        this.documentStructureService = documentStructureService;
        this.yamlReplacementService = yamlReplacementService;
        this.transcriptionReplacementService = transcriptionReplacementService;
    }

    /**
     * Find all files tagged with the specified tag
     */
    private findTaggedFiles(replacementSpecsTag: string): TFile[] {
        const targetTag = `#${replacementSpecsTag}`;
        return this.app.vault.getMarkdownFiles().filter(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache) return false;

            // Check both frontmatter tags and inline tags
            const hasFrontmatterTag = cache.frontmatter?.tags?.some((tag: string) => 
                tag === replacementSpecsTag || tag === targetTag
            );
            
            const hasInlineTag = cache.tags?.some(tag => tag.tag === targetTag);

            if (hasFrontmatterTag || hasInlineTag) {
                console.log('Found tag in file:', file.path);
                console.log('Frontmatter tags:', cache.frontmatter?.tags);
                console.log('Inline tags:', cache.tags);
            }

            return hasFrontmatterTag || hasInlineTag;
        });
    }

    /**
     * Collect replacement specs from files tagged with the given tag
     */
    private async collectTaggedReplacementSpecsStrings(replacementSpecsTag: string): Promise<{content: string, filePath: string}[]> {
        const allSpecs: {content: string, filePath: string}[] = [];
        const taggedFiles = this.findTaggedFiles(replacementSpecsTag);
        console.log(`Files tagged with '#${replacementSpecsTag}':`, taggedFiles);

        for (const file of taggedFiles) {
            const content = await this.app.vault.read(file);
            
            allSpecs.push({
                content,
                filePath: file.path
            });
        }

        return allSpecs;
    }


    /**
     * Collect replacement specs from the active file
     */
    private async collectActiveFileSpecsString(markdownView: MarkdownView, headerContainingReplacements: string): Promise<{content: string, filePath: string} | null> {
        const file = markdownView.file;
        if (!file)
            throw new Error('No file is currently open');

        const content = await this.app.vault.read(file);
        const metadata = this.app.metadataCache.getFileCache(file);
        const rootNode = this.documentStructureService.buildHeaderTree(metadata!, content);
        const replacementsHeader = this.documentStructureService.findFirstNodeMatchingHeading(
            rootNode,
            headerContainingReplacements
        );
        if (!replacementsHeader) {
            const shouldContinue = await new Promise<boolean>(resolve => {
                const modal = new ConfirmationModal(
                    this.app,
                    `Aucune section de remplacement des speakers n'a été trouvée dans le fichier ${file.path}. Voulez-vous continuer quand même ?`,
                    resolve
                );
                modal.open();
            });

            if (!shouldContinue) {
                throw new Error(`Opération annulée par l'utilisateur - Aucune section de remplacement trouvée dans ${file.path}`);
            }
            return null;
        }
        return  {content: replacementsHeader?.content, filePath: file.path};
    }

    /**
     * Replace transcription in the current file using all collected replacement specs
     */
    public async replaceTranscription(
        markdownView: MarkdownView, 
        replacementSpecsTag: string,
        headerContainingTranscript: string,
        headerContainingReplacements: string
    ): Promise<ReplacementReport[]> {
        const file = markdownView.file;
        if (!file) return [];

        const content = await this.app.vault.read(file);
        const metadata = this.app.metadataCache.getFileCache(file);
        const rootNode = this.documentStructureService.buildHeaderTree(metadata!, content);

        // Collect all replacement specs
        const activeFileSpecsStr = await this.collectActiveFileSpecsString(markdownView, headerContainingReplacements);
        let allSpecs : ReplacementSpecs[] = [];
        
        if (activeFileSpecsStr !== null) {
            const activeFileSpecs = this.yamlStringsToReplacementSpecs([activeFileSpecsStr]);
            allSpecs = allSpecs.concat(activeFileSpecs);
        }
        
        const taggedFilesSpecsStr = await this.collectTaggedReplacementSpecsStrings(replacementSpecsTag);
        const taggedFilesSpecs = this.yamlStringsToReplacementSpecs(taggedFilesSpecsStr);
        allSpecs = allSpecs.concat(taggedFilesSpecs);

        console.log('Found replacement specs:', allSpecs);

        if (allSpecs.length === 0) {
            new Notice('No replacement specifications found');
            return [];
        }

        // Find the transcript header
        const transcriptHeader = this.documentStructureService.findFirstNodeMatchingHeading(
            rootNode,
            headerContainingTranscript
        );

        if (!transcriptHeader) {
            new Notice('No transcript header found');
            return [];
        }

        // Apply all replacements and get report
        const { content: newContent, reports } = this.transcriptionReplacementService.applyReplacements(
            transcriptHeader.content,
            allSpecs
        );
        
        // Update the content
        transcriptHeader.content = newContent;
        const finalContent = this.documentStructureService.renderToMarkdown(rootNode);
        await this.app.vault.modify(file, finalContent);
        
        // Show the report modal
        if (reports.length > 0) {
            new ReplacementReportModal(this.app, reports).open();
        }
        
        new Notice('Transcription replaced');
        return reports;
    }

    private yamlStringsToReplacementSpecs(yamlStrings: {content: string, filePath: string}[]): ReplacementSpecs[] {
        try {
            return yamlStrings.map(({content, filePath}) => {
                try {
                    const yamlContent = this.yamlReplacementService.fromBlock(content);
                    return this.yamlReplacementService.parse(yamlContent, filePath);
                } catch (error) {
                    let errorContent;
                    if (error instanceof YamlValidationError) {
                        errorContent = `Error in file ${filePath}: ${error.details}`;
                        
                    } else {
                        new Notice(`Unexpected error in file ${filePath}`);
                        console.error(`Unexpected error in ${filePath}:`, error);
                    }
                    throw Error(error);
                }
            });
        } catch (error) {
            new Notice(error.message);
            throw error;
        }
        
    }
}

class ConfirmationModal extends Modal {
    private resolvePromise: (value: boolean) => void;

    constructor(app: App, private message: string, resolve: (value: boolean) => void) {
        super(app);
        this.resolvePromise = resolve;
    }

    onOpen() {
        const {contentEl} = this;
        
        contentEl.createEl("p", { text: this.message });
        
        const buttonContainer = contentEl.createDiv("modal-button-container");
        
        new ButtonComponent(buttonContainer)
            .setButtonText("Continuer")
            .setCta()
            .onClick(() => {
                this.resolvePromise(true);
                this.close();
            });

        new ButtonComponent(buttonContainer)
            .setButtonText("Annuler")
            .onClick(() => {
                this.resolvePromise(false);
                this.close();
            });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}
