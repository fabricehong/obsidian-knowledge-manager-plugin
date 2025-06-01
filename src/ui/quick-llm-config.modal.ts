import { App, Modal, Notice, Setting } from 'obsidian';
import KnowledgeManagerPlugin from '../main';

export class QuickLLMConfigModal extends Modal {
    private plugin: KnowledgeManagerPlugin;

    constructor(app: App, plugin: KnowledgeManagerPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Select LLM Configuration' });

        // Créer le dropdown
        new Setting(contentEl)
            .addDropdown(dropdown => {
                // Ajouter les configurations disponibles
                this.plugin.settings.llmConfigurations.forEach(config => {
                    const org = this.plugin.settings.llmOrganizations.find(o => o.id === config.organisationId);
                    const label = `${config.model} on ${org?.name || 'unknown'}`;
                    dropdown.addOption(config.id, label);
                });
                
                // Sélectionner la configuration actuelle
                dropdown.setValue(this.plugin.settings.selectedLlmConfiguration);
                
                // Gérer le changement
                dropdown.onChange(async (value) => {
                    this.plugin.settings.selectedLlmConfiguration = value;
                    await this.plugin.saveSettings();
                    this.plugin.notifyChatPanelsOfServiceChange();
                    new Notice('LLM Configuration updated');
                    this.close();
                });
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
