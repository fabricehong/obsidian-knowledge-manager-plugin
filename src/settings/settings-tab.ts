import { App, PluginSettingTab, Setting, TFolder } from 'obsidian';
import KnowledgeManagerPlugin from '../main';
import { PluginSettings } from '../types/settings';
import { FileSuggestModal } from '../ui/file-suggest-modal';
import { FolderSuggestModal } from '../ui/folder-suggest-modal';
import { TemplateManager } from '../services/template-manager';

export class SettingsTab extends PluginSettingTab {
    plugin: KnowledgeManagerPlugin;

    constructor(app: App, plugin: KnowledgeManagerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Knowledge Manager Settings' });

        new Setting(containerEl)
            .setName('OpenAI API Key')
            .setDesc('Your OpenAI API key')
            .addText(text => text
                .setPlaceholder('Enter your API key')
                .setValue(this.plugin.settings.openAIApiKey)
                .onChange(async (value) => {
                    this.plugin.settings.openAIApiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Header containing transcript')
            .setDesc('The header name that contains the original transcript')
            .addText(text => text
                .setPlaceholder('Original')
                .setValue(this.plugin.settings.headerContainingTranscript)
                .onChange(async (value) => {
                    this.plugin.settings.headerContainingTranscript = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Translation Prompt Template')
            .setDesc('Template file to use for translation prompts')
            .addText(text => {
                const textComponent = text
                    .setPlaceholder('Example: translation-prompt.md')
                    .setValue(this.plugin.settings.translationPromptTemplate || '')
                    .setDisabled(true);
                
                textComponent.inputEl.disabled = true;
            })
            .addButton(button => button
                .setButtonText('Browse')
                .onClick(() => {
                    new FileSuggestModal(
                        this.app,
                        this.plugin.settings.templateDirectory,
                        async (filePath: string) => {
                            this.plugin.settings.translationPromptTemplate = filePath;
                            await this.plugin.saveSettings();
                            this.display();
                        }
                    ).open();
                }));

        new Setting(containerEl)
            .setName('Template Directory')
            .setDesc('Directory where template files will be stored')
            .addText(text => {
                text.setPlaceholder('Example: knowledge-manager-templates')
                    .setValue(this.plugin.settings.templateDirectory)
                    .setDisabled(true);
            })
            .addButton(button => button
                .setButtonText('Browse')
                .onClick(() => {
                    new FolderSuggestModal(
                        this.app,
                        async (folder: TFolder) => {
                            const folderPath = folder.path;
                            this.plugin.settings.templateDirectory = folderPath;
                            await this.plugin.saveSettings();
                            // Initialize templates in the new directory
                            const templateManager = new TemplateManager(this.app);
                            await templateManager.initialize(folderPath);
                            this.display();
                        }
                    ).open();
                }));

        new Setting(containerEl)
            .setName('Replacement Specs Tag')
            .setDesc('The tag used to identify replacement specifications in your notes')
            .addText(text => text
                .setPlaceholder('ReplacementSpecs')
                .setValue(this.plugin.settings.replacementSpecsTag)
                .onChange(async (value) => {
                    this.plugin.settings.replacementSpecsTag = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Vocabulary specs tag')
            .setDesc('Tag used to identify files containing vocabulary lists')
            .addText(text => text
                .setPlaceholder('vocabulary')
                .setValue(this.plugin.settings.vocabularySpecsTag)
                .onChange(async (value) => {
                    this.plugin.settings.vocabularySpecsTag = value;
                    await this.plugin.saveSettings();
                }));

        // Glossary Settings
        new Setting(containerEl)
            .setName('Glossary Initial Prompt Template')
            .setDesc('Template file to use for initial glossary prompts')
            .addText(text => {
                const textComponent = text
                    .setPlaceholder('Example: glossary-initial-prompt.md')
                    .setValue(this.plugin.settings.glossaryInitialPromptTemplate || '')
                    .setDisabled(true);
                
                textComponent.inputEl.disabled = true;
            })
            .addButton(button => button
                .setButtonText('Browse')
                .onClick(() => {
                    new FileSuggestModal(
                        this.app,
                        this.plugin.settings.templateDirectory,
                        async (filePath: string) => {
                            this.plugin.settings.glossaryInitialPromptTemplate = filePath;
                            await this.plugin.saveSettings();
                            this.display();
                        }
                    ).open();
                }));

        new Setting(containerEl)
            .setName('Glossary Iteration Prompt Template')
            .setDesc('Template file to use for glossary iteration prompts')
            .addText(text => {
                const textComponent = text
                    .setPlaceholder('Example: glossary-iteration-prompt.md')
                    .setValue(this.plugin.settings.glossaryIterationPromptTemplate || '')
                    .setDisabled(true);
                
                textComponent.inputEl.disabled = true;
            })
            .addButton(button => button
                .setButtonText('Browse')
                .onClick(() => {
                    new FileSuggestModal(
                        this.app,
                        this.plugin.settings.templateDirectory,
                        async (filePath: string) => {
                            this.plugin.settings.glossaryIterationPromptTemplate = filePath;
                            await this.plugin.saveSettings();
                            this.display();
                        }
                    ).open();
                }));

        new Setting(containerEl)
            .setName('Max Glossary Iterations')
            .setDesc('Maximum number of iterations for glossary refinement')
            .addText(text => text
                .setPlaceholder('5')
                .setValue(String(this.plugin.settings.maxGlossaryIterations))
                .onChange(async (value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue > 0) {
                        this.plugin.settings.maxGlossaryIterations = numValue;
                        await this.plugin.saveSettings();
                    }
                }));
    }
}
