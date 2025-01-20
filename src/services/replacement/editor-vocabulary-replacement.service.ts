import { App, Editor, MarkdownView, Notice, TFile } from "obsidian";
import { DocumentStructureService } from "../document-structure.service";
import { YamlVocabularyService } from "./yaml-vocabulary.service";
import { TranscriptionReplacementService } from "./transcription-replacement.service";
import { ReplacementSpecs, ReplacementSummary } from "../../models/interfaces";
import { YamlReplacementService } from "./yaml-replacement.service";
import { TextCorrector } from "../../vocabulary/textCorrector";
import { VocabularySpecs } from "../../models/schemas";
import { YamlValidationError } from "../../models/errors";
import { ReplacementReportModal } from "../../ui/replacement-report.modal";
import { VocabularyReplacementSummaryModal } from "../../ui/vocabulary-replacement-summary.modal";

export class EditorVocabularyReplacementService {
    private documentStructureService: DocumentStructureService;
    private yamlVocabularyService: YamlVocabularyService;
    private transcriptionReplacementService: TranscriptionReplacementService;
    private yamlReplacementService: YamlReplacementService;
    private textCorrector: TextCorrector;
    private app: App;

    constructor(
        app: App,
        documentStructureService: DocumentStructureService,
        yamlVocabularyService: YamlVocabularyService,
        transcriptionReplacementService: TranscriptionReplacementService,
        yamlReplacementService: YamlReplacementService,
        textCorrector: TextCorrector
    ) {
        this.app = app;
        this.documentStructureService = documentStructureService;
        this.yamlVocabularyService = yamlVocabularyService;
        this.transcriptionReplacementService = transcriptionReplacementService;
        this.yamlReplacementService = yamlReplacementService;
        this.textCorrector = textCorrector;
    }

    /**
     * Find all files tagged with the specified tag
     */
    private findTaggedFiles(vocabularySpecsTag: string): TFile[] {
        const targetTag = `#${vocabularySpecsTag}`;
        return this.app.vault.getMarkdownFiles().filter(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache) return false;

            // Check both frontmatter tags and inline tags
            const hasFrontmatterTag = cache.frontmatter?.tags?.some((tag: string) => 
                tag === vocabularySpecsTag || tag === targetTag
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
     * Collect vocabulary specs from files tagged with the given tag
     */
    private async collectTaggedVocabularySpecsStrings(vocabularySpecsTag: string): Promise<{content: string, filePath: string}[]> {
        const allSpecs: {content: string, filePath: string}[] = [];
        const taggedFiles = this.findTaggedFiles(vocabularySpecsTag);

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
     * Collect vocabulary specs from the active file
     */
    private async collectActiveFileSpecsString(markdownView: MarkdownView, headerContainingVocabulary: string): Promise<{content: string, filePath: string}> {
        const file = markdownView.file;
        if (!file)
            throw new Error('No file is currently open');

        const content = await this.app.vault.read(file);
        const metadata = this.app.metadataCache.getFileCache(file);
        const rootNode = this.documentStructureService.buildHeaderTree(metadata!, content);
        const vocabularyHeader = this.documentStructureService.findFirstNodeMatchingHeading(
            rootNode,
            headerContainingVocabulary
        );
        if (!vocabularyHeader)
            throw new Error(`Vocabulary header '${headerContainingVocabulary}' not found in file ${file.path}`);
        return {content: vocabularyHeader?.content, filePath: file.path};
    }

    private yamlStringsToVocabularySpecs(yamlStrings: {content: string, filePath: string}[]): VocabularySpecs[] {
        try {
            return yamlStrings.map(({content, filePath}) => {
                try {
                    const yamlContent = this.yamlReplacementService.fromBlock(content);
                    return this.yamlVocabularyService.parse(yamlContent, filePath);
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

    /**
     * Replace text in the current file using vocabulary
     */
    public async replaceWithVocabulary(
        markdownView: MarkdownView,
        vocabularySpecsTag: string,
        headerContainingTranscript: string,
        headerContainingReplacements: string
    ) {
        try {
            // Collect all vocabulary specs
            const taggedFilesSpecsStr = await this.collectTaggedVocabularySpecsStrings(vocabularySpecsTag);
            const taggedFilesSpecs = this.yamlStringsToVocabularySpecs(taggedFilesSpecsStr);

            const vocabularyTerms = taggedFilesSpecs.flatMap(spec => spec.vocabulary || []);

            if (vocabularyTerms.length === 0) {
                new Notice('No vocabulary terms found');
                return;
            }

            // Collect replacements
            const activeFileSpecsString = await this.collectActiveFileSpecsString(markdownView, headerContainingReplacements);
            const activeFileSpecs = this.yamlStringsToReplacementSpecs([activeFileSpecsString]);
            

            // Set vocabulary and get correction summary
            this.textCorrector.setVocabulary(vocabularyTerms);

            // Find transcription
            const file = markdownView.file;
            if (!file) return;
            const content = await this.app.vault.read(file);
            const metadata = this.app.metadataCache.getFileCache(file);
            const rootNode = this.documentStructureService.buildHeaderTree(metadata!, content);
            const transcriptHeader = this.documentStructureService.findFirstNodeMatchingHeading(
                rootNode,
                headerContainingTranscript
            );

            if (!transcriptHeader) {
                new Notice('No transcript header found');
                return;
            }

            // simple replacements
            const { reports: replacementReport, result: contentAfterReplacements } = this.transcriptionReplacementService.applyReplacements(transcriptHeader.content, activeFileSpecs);

            if (replacementReport.length > 0) {
                new ReplacementReportModal(this.app, replacementReport).open();
            }

            // Appl all replacements
            

            // then vocabulary replacements
            const correctionResult = this.textCorrector.correctText(contentAfterReplacements);
            
            // Create vocabulary replacements report
            const replacementMap = new Map<string, { corrected: string, count: number }>();
            correctionResult.corrections.forEach(correction => {
                const existing = replacementMap.get(correction.original);
                if (existing) {
                    existing.count++;
                } else {
                    replacementMap.set(correction.original, { 
                        corrected: correction.corrected, 
                        count: 1 
                    });
                }
            });

            const summary: ReplacementSummary = {
                totalReplacements: correctionResult.corrections.length,
                replacements: Array.from(replacementMap.entries()).map(([original, value]) => ({
                    original,
                    corrected: value.corrected,
                    occurrences: value.count
                }))
            };

            
            
            new Notice('Transcription replaced');

            // user must confirm all replacements
            const modal = new VocabularyReplacementSummaryModal(
                this.app,
                summary,
                async () => {
                    // Update the content
                    transcriptHeader.content = correctionResult.correctedText;
                    const finalContent = this.documentStructureService.renderToMarkdown(rootNode);
                    await this.app.vault.modify(file, finalContent);
                    
                    new Notice(`Applied ${summary.totalReplacements} replacements`);
                }
            );
            modal.open();
        } catch (error) {
            console.error('Error replacing vocabulary:', error);
            new Notice('Error replacing vocabulary: ' + error.message);
        }
    }
}
