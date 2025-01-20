import { App, Editor, MarkdownView, Notice, Plugin, TFolder, TFile } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS, HeaderNode, RootNode, ReplacementSpecs } from './models/interfaces';
import { SettingsTab } from './settings/settings-tab';
import { FolderSuggestModal } from './ui/folder-suggest.modal';
import { ServiceContainer } from './services/service-container';
import { TemplateManager } from './services/template-manager';
import { getTemplates } from './templates';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { TranscriptFileService } from './services/replacement/transcript-file.service';
import { TranscriptionReplacementService } from './services/replacement/transcription-replacement.service';
import { ReplacementSpecsParsingService } from './services/replacement/replacement-specs-parsing.service';
import { EditorVocabularyReplacementService } from './services/replacement/editor-vocabulary-replacement.service';
import { VocabularySpecsParsingService } from './services/replacement/vocabulary-specs-parsing.service';
import { TextCorrector } from './vocabulary/textCorrector';

export default class KnowledgeManagerPlugin extends Plugin {
    settings: PluginSettings;
    private serviceContainer: ServiceContainer;
    private editorVocabularyReplacementService: EditorVocabularyReplacementService;
    private static readonly REPLACEMENTS_HEADER = 'Replacements';

    async onload() {
        await this.loadSettings();

        // Initialize service container
        this.serviceContainer = ServiceContainer.getInstance(this.app);
        await this.serviceContainer.initializeWithSettings(this.settings);

        // Wait for app to be fully loaded before initializing templates
        this.app.workspace.onLayoutReady(async () => {
            const templateManager = new TemplateManager(this.app);
            const success = await templateManager.initialize(this.settings.templateDirectory);
            
            // Update translation prompt template path if needed
            if (success && !this.settings.translationPromptTemplate) {
                const translationTemplate = `${this.settings.templateDirectory}/translation-prompt.md`;
                if (this.app.vault.getAbstractFileByPath(translationTemplate)) {
                    this.settings.translationPromptTemplate = translationTemplate;
                    await this.saveSettings();
                }
            }
        });

        // Add the diffuse command
        this.addCommand({
            id: 'diffuse-note',
            name: 'Diffuse current note',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    if (!checking) {
                        this.diffuseNote(markdownView);
                    }
                    return true;
                }
                return false;
            }
        });

        // Add the summarize command
        this.addCommand({
            id: 'summarize-note',
            name: 'Summarize current note',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    if (!checking) {
                        this.summarizeNote(markdownView);
                    }
                    return true;
                }
                return false;
            }
        });

        // Add the map vault command
        this.addCommand({
            id: 'map-vault',
            name: 'Map Vault',
            callback: () => {
                new FolderSuggestModal(this.app, (folder: TFolder) => {
                    try {
                        const vaultMap = this.serviceContainer.vaultMapperService.mapDirectory(folder);
                        const stringRepresentation = this.serviceContainer.vaultMapperService.getStringRepresentation(vaultMap);
                        console.log(`Structure for folder "${folder.path}":\n${stringRepresentation}`);
                        new Notice(`Map generated for "${folder.path}"! Check the console for details.`);
                    } catch (error) {
                        console.error('Error mapping folder:', error);
                        new Notice('Error mapping folder. Check the console for details.');
                    }
                }).open();
            }
        });

        // Add the print file cache command
        this.addCommand({
            id: 'print-file-cache',
            name: 'Print File Cache',
            checkCallback: (checking: boolean) => {
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (activeView?.file) {
                    if (!checking) {
                        const file = activeView.file;
                        const cache = this.app.metadataCache.getFileCache(file);
                        if (cache) {
                            const content = activeView.editor.getValue();
                            const headerTree = this.serviceContainer.documentStructureService.buildHeaderTree(cache, content);
                            console.log('Header tree for', file.path + ':', headerTree);
                            new Notice('Header tree printed to console');
                        } else {
                            new Notice('No cache available for this file');
                        }
                    }
                    return true;
                }
                return false;
            }
        });

        // Add the remove references content command
        this.addCommand({
            id: 'remove-refs-content',
            name: 'Remove References Content',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    if (!checking) {
                        this.removeRefsContent(markdownView);
                    }
                    return true;
                }
                return false;
            }
        });

        // Add command to print translation prompt template
        this.addCommand({
            id: 'print-translation-template',
            name: 'Print Translation Prompt Template',
            callback: async () => {
                const templatePath = this.settings.translationPromptTemplate;
                if (!templatePath) {
                    new Notice('No translation prompt template set in settings');
                    return;
                }

                try {
                    const file = this.app.vault.getAbstractFileByPath(templatePath);
                    if (file instanceof TFile) {
                        const content = await this.app.vault.read(file);
                        console.log('Translation Prompt Template Content:');
                        console.log('----------------------------------------');
                        console.log(content);
                        console.log('----------------------------------------');
                        new Notice('Translation prompt template content printed to console');
                    } else {
                        new Notice('Template file not found: ' + templatePath);
                    }
                } catch (error) {
                    console.error('Error reading template file:', error);
                    new Notice('Error reading template file');
                }
            }
        });

        // Add the add replacements section command
        this.addCommand({
            id: 'add-replacements-section',
            name: 'Add section: replacements',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    if (!checking) {
                        this.addReplacementsSection(markdownView);
                    }
                    return true;
                }
                return false;
            }
        });

        // Add the replace transcription command
        this.addCommand({
            id: 'replace-transcription',
            name: 'Replace transcription',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    if (!checking) {
                        this.replaceTranscription(markdownView);
                    }
                    return true;
                }
                return false;
            }
        });

        // Add vocabulary replacement command
        this.addCommand({
            id: 'replace-text-using-vocabulary',
            name: 'Replace text using vocabulary',
            editorCallback: (editor: Editor) => {
                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (view) {
                    this.replaceWithVocabulary(view);
                }
            }
        });

        // Add the settings tab
        this.addSettingTab(new SettingsTab(this.app, this));
    }

    async loadSettings() {
        const data = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    }

    async saveSettings() {
        await this.saveData(this.settings);
        await this.serviceContainer.initializeWithSettings(this.settings);
    }

    private async summarizeNote(markdownView: MarkdownView) {
        const editor = markdownView.editor;
        const content = editor.getValue();
        
        try {
            new Notice('Summarizing note...');
            const summary = await this.serviceContainer.noteSummarizationService.summarize(content);

            console.log('Summary result:', summary);
            new Notice('Note has been summarized! Check the console for details.');
        } catch (error) {
            console.error('Error during summarization:', error);
            new Notice('Error during summarization. Check the console for details.');
        }
    }

    private async diffuseNote(markdownView: MarkdownView) {
        const editor = markdownView.editor;
        const content = editor.getValue();
        const file = markdownView.file;
        if (!file) {
            new Notice('No file is currently open');
            return;
        }
        
        try {
            new Notice('Diffusing note...');

            // Get the file cache and build header tree
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache) {
                throw new Error('No cache available for this file');
            }

            const headerTree = this.serviceContainer.documentStructureService.buildHeaderTree(cache, content);
            const diffusionPlans = this.serviceContainer.knowledgeDiffusionService.buildDiffusionRepresentation(headerTree);

            if (diffusionPlans.length === 0) {
                new Notice('No diffusion references found in the note');
                return;
            }

            // Execute the diffusion plans
            await this.serviceContainer.knowledgeDiffusionService.diffuseKnowledge(
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

    private async removeRefsContent(view: MarkdownView) {
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
            const rootNode = this.serviceContainer.documentStructureService.buildHeaderTree(cache, content);
            
            // Clean the content using document cleaning service
            const cleanedRootNode = this.serviceContainer.documentCleaningService.cleanNode(rootNode) as RootNode;
            
            // Convert back to markdown
            const cleanedContent = this.serviceContainer.documentStructureService.renderToMarkdown(cleanedRootNode);
            
            // Update the editor with the cleaned content
            editor.setValue(cleanedContent);
            
            new Notice('References content has been removed');
        } catch (error) {
            console.error('Error while removing references:', error);
            new Notice(`Error while removing references: ${error.message}`);
        }
    }

    private async addReplacementsSection(markdownView: MarkdownView) {
        const file = markdownView.file;
        if (!file) return;

        const content = await this.app.vault.read(file);
        const metadata = this.app.metadataCache.getFileCache(file);
        const doc = this.serviceContainer.documentStructureService.buildHeaderTree(metadata!, content);

        // Check if replacements section already exists
        const existingReplacements = this.serviceContainer.documentStructureService.findFirstNodeMatchingHeading(
            doc,
            KnowledgeManagerPlugin.REPLACEMENTS_HEADER
        );
        if (existingReplacements) {
            new Notice('Replacements section already exists');
            return;
        }

        // Find transcript header
        const transcriptHeader = this.serviceContainer.documentStructureService.findFirstNodeMatchingHeading(
            doc,
            this.settings.headerContainingTranscript
        );

        if (!transcriptHeader) {
            new Notice(`Header '${this.settings.headerContainingTranscript}' not found`);
            return;
        }

        // Parse transcript and get unique speakers
        const interventions = this.serviceContainer.transcriptFileService.parseTranscript(transcriptHeader.content);
        const speakers = this.serviceContainer.transcriptFileService.getUniqueSpeakers(interventions);

        // Create initial replacement specs from speakers
        const specs = this.serviceContainer.transcriptionReplacementService.createFromSpeakers(speakers);
        const yamlContent = this.serviceContainer.yamlReplacementService.stringify(specs);
        const codeBlock = this.serviceContainer.yamlReplacementService.toBlock(yamlContent);

        // Add new header node
        const newHeader = new HeaderNode();
        newHeader.level = 1;
        newHeader.heading = KnowledgeManagerPlugin.REPLACEMENTS_HEADER;
        newHeader.content = codeBlock;
        doc.children.unshift(newHeader);

        // Convert back to markdown and update the file
        const newContent = this.serviceContainer.documentStructureService.renderToMarkdown(doc);
        await this.app.vault.modify(file, newContent);
        
        new Notice('Added replacements section');
    }

    private async replaceTranscription(markdownView: MarkdownView) {
        await this.serviceContainer.editorTranscriptionReplacementService.replaceTranscription(
            markdownView,
            this.settings.replacementSpecsTag,
            this.settings.headerContainingTranscript,
            KnowledgeManagerPlugin.REPLACEMENTS_HEADER,
        );
    }

    private async replaceWithVocabulary(markdownView: MarkdownView) {
        await this.serviceContainer.editorVocabularyReplacementService.replaceWithVocabulary(
            markdownView,
            this.settings.vocabularySpecsTag,
            this.settings.headerContainingTranscript,
            KnowledgeManagerPlugin.REPLACEMENTS_HEADER
        );
    }
}
