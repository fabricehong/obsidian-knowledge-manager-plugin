import { App, Editor, MarkdownView, Notice, TFile } from "obsidian";
import { YamlService } from "../document/yaml.service";
import { TranscriptionReplacementService } from "../replacement/apply-replacement/transcription-replacement.service";
import { ReplacementSummary } from "../../models/interfaces";
import { TextCorrector } from "./textCorrector";
import { ReplacementSpecs, VocabularySpecs } from "../../models/schemas";
import { YamlValidationError } from "../../models/errors";
import { ReplacementReportModal } from "../replacement/apply-replacement/ui/replacement-report.modal";
import { VocabularyReplacementSummaryModal } from "./ui/vocabulary-replacement-summary.modal";
import { DocumentStructureService } from "../document/document-structure.service";
import { TaggedFilesService } from '../document/tagged-files.service';
import { EditorReplacementSpecsStorageService } from "../replacement/editor-replacement-specs-storage.service";
import { EditorVocabularySpecsStorageService } from "../replacement/editor-vocabulary-specs-storage.service";

/**
 * Service responsible for managing vocabulary replacements in the Obsidian editor.
 */
export class EditorVocabularyReplacementService {

    constructor(
        private app: App,
        private documentStructureService: DocumentStructureService,
        private transcriptionReplacementService: TranscriptionReplacementService,
        private yamlVocabularyService: YamlService<VocabularySpecs>,
        private yamlReplacementService: YamlService<ReplacementSpecs>,
        private textCorrector: TextCorrector,
        private taggedFilesService: TaggedFilesService,
        private editorVocabularySpecsStorageService: EditorVocabularySpecsStorageService,
        private editorReplacementSpecsStorageService: EditorReplacementSpecsStorageService,
    ) {
    }

    /**
     * Find all files tagged with the specified tag
     */
    private findTaggedFiles(vocabularySpecsTag: string): TFile[] {
        return this.taggedFilesService.findTaggedFiles(vocabularySpecsTag);
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

    private processVocabularySpecs(file: {content: string, filePath: string}): VocabularySpecs {
        const yamlContent = this.yamlVocabularyService.fromYamlBlock(file.content);
        return this.yamlVocabularyService.fromYaml(yamlContent, file.filePath);
    }

    private processVocabularySpecsFiles(files: {content: string, filePath: string}[]): VocabularySpecs[] {
        return files.map(file => this.processVocabularySpecs(file));
    }

    private yamlStringsToVocabularySpecs(yamlStrings: {content: string, filePath: string}[]): VocabularySpecs[] {
        try {
            return yamlStrings.map(({content, filePath}) => {
                try {
                    return this.processVocabularySpecs({content, filePath});
                } catch (error) {
                    let errorContent;
                    if (error instanceof YamlValidationError) {
                        errorContent = error.details;
                    } else {
                        errorContent = error instanceof Error ? error.message : 'Unknown error';
                    }
                    new Notice(`Error processing vocabulary specs in file ${filePath}: ${errorContent}`);
                    throw error;
                }
            });
        } catch (error) {
            console.error('Error processing vocabulary specs:', error);
            throw error;
        }
    }

    private yamlStringsToReplacementSpecs(yamlStrings: {content: string, filePath: string}[]): ReplacementSpecs[] {
        try {
            return yamlStrings.map(({content, filePath}) => {
                try {
                    const yamlContent = this.yamlReplacementService.fromYamlBlock(content);
                    return this.yamlReplacementService.fromYaml(yamlContent, filePath);
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
        const file: TFile = markdownView.file!;
        try {

            const vocabularySpecFiles = await this.editorVocabularySpecsStorageService.readSpecsFromTaggedFiles();

            const vocabularyTerms = vocabularySpecFiles.flatMap(spec => spec.voc.vocabulary || []);

            const activeFileSpecs = await this.editorReplacementSpecsStorageService.readSpecsFromActiveFile(file);


            // Set vocabulary and get correction summary
            this.textCorrector.setVocabulary(vocabularyTerms);

            // Find transcription
            const rootNode = await this.documentStructureService.buildHeaderTree(this.app, file);
            const transcriptHeader = this.documentStructureService.findFirstNodeMatchingHeading(
                rootNode.root,
                headerContainingTranscript
            );

            if (!transcriptHeader) {
                new Notice('No transcript header found');
                return;
            }

            // simple replacements
            const { reports: replacementReport, result: contentAfterReplacements } = this.transcriptionReplacementService.applyReplacements(transcriptHeader.content, [activeFileSpecs.specs]);

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
                    const finalContent = this.documentStructureService.renderToMarkdown(rootNode.root);
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
