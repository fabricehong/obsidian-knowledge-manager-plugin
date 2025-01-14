import { App, Editor, MarkdownView, Notice, Plugin, TFolder, TFile } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS } from './models/interfaces';
import { SettingsTab } from './settings/settings-tab';
import { FolderSuggestModal } from './ui/folder-suggest.modal';
import { ServiceContainer } from './services/service-container';
import { TemplateManager } from './services/template-manager';
import { getTemplates } from './templates';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export default class KnowledgeManagerPlugin extends Plugin {
    settings: PluginSettings;
    private serviceContainer: ServiceContainer;

    async onload() {
        await this.loadSettings();

        // Initialize service container
        this.serviceContainer = ServiceContainer.initialize(this.app);

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
            const cleanedContent = this.serviceContainer.documentCleaningService.cleanNode(rootNode);
            
            // Update the editor with the cleaned content
            editor.setValue(cleanedContent);
            
            new Notice('References content has been removed');
        } catch (error) {
            console.error('Error while removing references:', error);
            new Notice(`Error while removing references: ${error.message}`);
        }
    }
}
