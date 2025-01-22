import { App, Editor, MarkdownView, Notice, TFile } from "obsidian";
import { ReplacementSpec, ReplacementReport, ReplacementStatistics, ReplacementCount, ReplacementSpecs } from "../../models/interfaces";
import { DocumentStructureService } from "../document-structure.service";
import { TranscriptionReplacementService } from "./transcription-replacement.service";
import { YamlReplacementService } from "./yaml-replacement.service";
import { YamlValidationError } from '../../models/errors';
import { ReplacementStatisticsModal, InfoModal, ReplacementConfirmationModal, ConfirmationModal } from "../../ui/replacement-statistics.modal";
import { convertToReplacementStatistics } from "./replacement-statistics.service";

export class EditorTranscriptionReplacementService {
    private app: App;
    private transcriptionReplacementService: TranscriptionReplacementService;
    private documentStructureService: DocumentStructureService;
    private yamlReplacementService: YamlReplacementService;

    constructor(
        app: App,
        transcriptionReplacementService: TranscriptionReplacementService,
        documentStructureService: DocumentStructureService,
        yamlReplacementService: YamlReplacementService
    ) {
        this.app = app;
        this.transcriptionReplacementService = transcriptionReplacementService;
        this.documentStructureService = documentStructureService;
        this.yamlReplacementService = yamlReplacementService;
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
                const modal = new ReplacementConfirmationModal(
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

        // Collect all replacement specs from both sources
        let allSpecs : ReplacementSpecs[] = [];
        
        // 1. Get specs from active file if they exist
        const activeFileSpecsStr = await this.collectActiveFileSpecsString(markdownView, headerContainingReplacements);
        if (activeFileSpecsStr !== null) {
            try {
                const activeFileSpecs = this.yamlStringsToReplacementSpecs([activeFileSpecsStr]);
                allSpecs = [...allSpecs, ...activeFileSpecs];
            } catch (error) {
                new Notice(`Error parsing replacement specs in active file: ${error.message}`);
            }
        }

        // 2. Get specs from tagged files
        const taggedFiles = await this.findTaggedFiles(replacementSpecsTag);
        if (taggedFiles.length > 0) {
            try {
                const yamlStrings = await Promise.all(
                    taggedFiles.map(async (file) => {
                        const content = await this.app.vault.read(file);
                        return {
                            content,
                            filePath: file.path
                        };
                    })
                );
                const taggedFilesSpecs = this.yamlStringsToReplacementSpecs(yamlStrings);
                allSpecs = [...allSpecs, ...taggedFilesSpecs];
            } catch (error) {
                new Notice(`Error parsing replacement specs in tagged files: ${error.message}`);
            }
        }

        // Check if we have any specs to apply
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
            new Notice(`Could not find header "${headerContainingTranscript}"`);
            return [];
        }

        // Apply all replacements and get report
        const { result: newContent, reports } = this.transcriptionReplacementService.applyReplacements(
            transcriptHeader.content,
            allSpecs
        );

        if (reports.length === 0) {
            new Notice("Aucun remplacement n'a été effectué");
            return [];
        }

        // Calculate statistics and show confirmation dialog
        const statistics = convertToReplacementStatistics(reports);
        const confirmationPromise = new Promise<boolean>((resolve) => {
            const modal = new ConfirmationModal(
                this.app,
                'Confirm Replacements',
                this.formatAllReplacementStatistics(statistics),
                () => resolve(true),
                () => resolve(false)
            );
            modal.open();
        });

        const confirmed = await confirmationPromise;
        if (!confirmed) {
            new Notice('Replacement operation cancelled');
            return [];
        }

        // Update the editor content
        const editor = markdownView.editor;
        const fullContent = editor.getValue();
        const newFullContent = fullContent.replace(transcriptHeader.content, newContent);
        editor.setValue(newFullContent);

        return reports;
    }

    private formatAllReplacementStatistics(statistics: ReplacementStatistics[]): string {
        const lines: string[] = [];
        let totalReplacements = 0;

        // Calculate total replacements across all categories
        for (const stat of statistics) {
            for (const replacement of stat.replacements) {
                totalReplacements += replacement.count;
            }
        }
        
        // Add total at the beginning
        lines.push(`Total replacements: ${totalReplacements}\n`);
        
        // Add details for each category
        for (const stat of statistics) {
            lines.push(`${stat.category}:`);
            for (const replacement of stat.replacements) {
                lines.push(`- ${replacement.from} → ${replacement.to} (${replacement.count} occurrences)`);
            }
            lines.push(''); // Empty line between categories
        }

        return lines.join('\n');
    }

    private formatReplacementStatistics(statistics: ReplacementStatistics): string {
        const lines: string[] = [];
        
        // Category
        lines.push(`${statistics.category}:`);
        
        // Replacements
        let totalReplacements = 0;
        for (const replacement of statistics.replacements) {
            lines.push(`- ${replacement.from} → ${replacement.to} (${replacement.count} occurrences)`);
            totalReplacements += replacement.count;
        }
        
        // Add total at the beginning
        lines.unshift(`Total replacements: ${totalReplacements}`);

        return lines.join('\n');
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
