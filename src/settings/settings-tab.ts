import { App, Notice, PluginSettingTab, Setting, Modal } from 'obsidian';
import KnowledgeManagerPlugin from '../main';
import { PluginSettings, generateId } from './settings';
import { FileSuggestModal } from '../ui/file-suggest-modal';
import { FolderSuggestModal } from '../ui/folder-suggest-modal';
import { TemplateManager } from '../services/template-manager';

class ConfirmationModal extends Modal {
    private onConfirm: () => void;

    constructor(app: App, onConfirm: () => void) {
        super(app);
        this.onConfirm = onConfirm;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Reset Settings' });
        contentEl.createEl('p', { text: 'Are you sure you want to reset all settings? This cannot be undone.' });

        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        
        buttonContainer.createEl('button', { text: 'Cancel' })
            .addEventListener('click', () => this.close());
        
        const confirmButton = buttonContainer.createEl('button', {
            text: 'Reset',
            cls: 'mod-warning'
        });
        confirmButton.addEventListener('click', async () => {
            this.onConfirm();
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

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

        // Section LLM Organizations
        containerEl.createEl('h3', { text: 'LLM Organizations' });

        // Bouton Reset to defaults
        new Setting(containerEl)
            .setName('Reset Settings')
            .setDesc('Reset all settings to their default values')
            .addButton(button => button
                .setButtonText('Reset to defaults')
                .setClass('mod-warning')
                .onClick(() => {
                    new ConfirmationModal(this.app, async () => {
                        await this.plugin.resetSettings();
                        this.display();
                        new Notice('Settings have been reset to defaults');
                    }).open();
                }));

        // Bouton pour ajouter une nouvelle organisation
        new Setting(containerEl)
            .setName('Add Organization')
            .setDesc('Add a new LLM organization')
            .addButton(button => button
                .setButtonText('Add')
                .onClick(async () => {
                    const newOrg = {
                        id: generateId('org'),
                        name: 'New Organization',
                        apiKey: '',
                        baseUrl: '',
                        supportedModels: ['gpt-4o']
                    };
                    this.plugin.settings.llmOrganizations.push(newOrg);
                    await this.plugin.saveSettings();
                    this.display();
                }));

        // Pour chaque organisation
        for (const org of this.plugin.settings.llmOrganizations) {
            const orgSection = containerEl.createDiv({ cls: 'setting-item' });
            
            // Nom de l'organisation
            new Setting(orgSection)
                .setName('Organization Name')
                .setDesc('Display name for this organization')
                .addText(text => text
                    .setValue(org.name)
                    .onChange(async (value) => {
                        org.name = value;
                        await this.plugin.saveSettings();
                    }));

            // API Key
            new Setting(orgSection)
                .setName('API Key')
                .setDesc('API key for ' + org.name)
                .addText(text => text
                    .setPlaceholder('Enter API key')
                    .setValue(org.apiKey)
                    .onChange(async (value) => {
                        org.apiKey = value;
                        await this.plugin.saveSettings();
                    }));

            // Base URL (optionnel)
            new Setting(orgSection)
                .setName('Base URL')
                .setDesc('API base URL for ' + org.name + ' (optional)')
                .addText(text => text
                    .setPlaceholder('Enter base URL')
                    .setValue(org.baseUrl)
                    .onChange(async (value) => {
                        org.baseUrl = value;
                        await this.plugin.saveSettings();
                    }));

            // Modèles supportés
            new Setting(orgSection)
                .setName('Supported Models')
                .setDesc('List of supported model names (comma-separated)')
                .addText(text => text
                    .setPlaceholder('gpt-4o, gpt-4o-mini')
                    .setValue(org.supportedModels.join(', '))
                    .onChange(async (value) => {
                        // Split, trim et nettoie la liste
                        org.supportedModels = value.split(',')
                            .map(model => model.trim())
                            .filter(model => model.length > 0);
                        await this.plugin.saveSettings();
                    }));

            // Bouton de suppression
            new Setting(orgSection)
                .addButton(button => button
                    .setButtonText('Delete')
                    .setClass('mod-warning')
                    .onClick(async () => {
                        // Vérifier si l'organisation est utilisée
                        const usedConfigs = this.plugin.settings.llmConfigurations
                            .filter(cfg => cfg.organisationId === org.id);
                        
                        if (usedConfigs.length > 0) {
                            new Notice('Cannot delete organization: it is used by one or more configurations');
                            return;
                        }

                        const index = this.plugin.settings.llmOrganizations.indexOf(org);
                        if (index > -1) {
                            this.plugin.settings.llmOrganizations.splice(index, 1);
                            await this.plugin.saveSettings();
                            this.display();
                        }
                    }));
        }

        // Espace entre les sections
        containerEl.createEl('div', { cls: 'setting-item-spacing' });

        // Section LLM Configurations
        containerEl.createEl('h3', { text: 'LLM Configurations' });

        // Sélection de la configuration active
        new Setting(containerEl)
            .setName('Active Configuration')
            .setDesc('Select the active LLM configuration')
            .addDropdown(dropdown => {
                this.plugin.settings.llmConfigurations.forEach(config => {
                    const org = this.plugin.settings.llmOrganizations.find(o => o.id === config.organisationId);
                    const label = `${config.id} (${config.model} on ${org?.name || 'unknown'})`;
                    dropdown.addOption(config.id, label);
                });
                dropdown.setValue(this.plugin.settings.selectedLlmConfiguration);
                dropdown.onChange(async (value) => {
                    this.plugin.settings.selectedLlmConfiguration = value;
                    await this.plugin.saveSettings();
                });
            });

        // Bouton pour ajouter une nouvelle configuration
        new Setting(containerEl)
            .setName('Add Configuration')
            .setDesc('Create a new LLM configuration')
            .addButton(button => button
                .setButtonText('Add')
                .onClick(async () => {
                    const id = generateId('cfg');
                    const newConfig = {
                        id,
                        name: 'New Configuration',
                        organisationId: this.plugin.settings.llmOrganizations[0].id,
                        model: this.plugin.settings.llmOrganizations[0].supportedModels[0]
                    };
                    this.plugin.settings.llmConfigurations.push(newConfig);
                    await this.plugin.saveSettings();
                    // Recharger la page des settings
                    this.display();
                }));

        // Liste des configurations existantes
        for (const config of this.plugin.settings.llmConfigurations) {
            const configSection = containerEl.createDiv({ cls: 'setting-item' });
            
            new Setting(configSection)
                .setName(`Configuration: ${config.id}`)
                .setDesc('Select organization and model')
                .addDropdown(dropdown => {
                    this.plugin.settings.llmOrganizations.forEach(org => {
                        dropdown.addOption(org.id, org.name);
                    });
                    dropdown.setValue(config.organisationId);
                    dropdown.onChange(async (value) => {
                        config.organisationId = value;
                        // Reset model to first supported model of new organization
                        const org = this.plugin.settings.llmOrganizations.find(o => o.id === value);
                        if (org && org.supportedModels.length > 0) {
                            config.model = org.supportedModels[0];
                        }
                        await this.plugin.saveSettings();
                        this.display();
                    });
                })
                .addDropdown(dropdown => {
                    const org = this.plugin.settings.llmOrganizations.find(o => o.id === config.organisationId);
                    if (org) {
                        org.supportedModels.forEach(model => {
                            dropdown.addOption(model, model);
                        });
                    }
                    dropdown.setValue(config.model);
                    dropdown.onChange(async (value) => {
                        config.model = value;
                        await this.plugin.saveSettings();
                    });
                })
                .addButton(button => button
                    .setButtonText('Delete')
                    .onClick(async () => {
                        const index = this.plugin.settings.llmConfigurations.indexOf(config);
                        if (index > -1) {
                            this.plugin.settings.llmConfigurations.splice(index, 1);
                            if (this.plugin.settings.selectedLlmConfiguration === config.id) {
                                // Si on supprime la configuration active, on sélectionne la première disponible
                                this.plugin.settings.selectedLlmConfiguration = 
                                    this.plugin.settings.llmConfigurations[0]?.id || '';
                            }
                            await this.plugin.saveSettings();
                            this.display();
                        }
                    }));

            // Espace entre les configurations
            containerEl.createEl('div', { cls: 'setting-item-spacing' });
        }

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
            .setName('Replacements Header')
            .setDesc('The header name used for replacements section')
            .addText(text => text
                .setPlaceholder('Replacements')
                .setValue(this.plugin.settings.replacementsHeader)
                .onChange(async (value) => {
                    this.plugin.settings.replacementsHeader = value;
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
                        async (folder: any) => {
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
                .setPlaceholder('a header name')
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
