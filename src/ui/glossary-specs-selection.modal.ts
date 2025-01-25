import { App, Modal, Setting } from 'obsidian';
import { ReplacementSpecs } from '../models/schemas';

export class GlossarySpecsSelectionModal extends Modal {
    private selectedSpecs: Map<string, boolean>;
    
    constructor(
        app: App,
        private specs: ReplacementSpecs,
        private onConfirm: (selectedSpecs: ReplacementSpecs | null) => void
    ) {
        super(app);
        this.selectedSpecs = new Map(
            specs.replacements.map(spec => [spec.target, false])
        );
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        
        // Header
        contentEl.createEl('h2', {text: 'Sélectionner les termes à intégrer'});
        
        // Liste des specs
        const listContainer = contentEl.createDiv();

        this.specs.replacements.forEach(spec => {
            new Setting(listContainer)
                .setName(spec.target)
                .addToggle(toggle => {
                    toggle
                        .setValue(false)
                        .onChange(value => {
                            this.selectedSpecs.set(spec.target, value);
                        });
                });
        });

        // Boutons
        const buttonContainer = contentEl.createDiv({
            cls: 'modal-button-container'
        });

        buttonContainer.createEl('button', {
            text: 'Confirmer',
            cls: 'mod-cta'
        }).addEventListener('click', () => {
            const filteredSpecs = {
                ...this.specs,
                replacements: this.specs.replacements.filter(
                    spec => this.selectedSpecs.get(spec.target)
                )
            };
            this.onConfirm(filteredSpecs);
            this.close();
        });

        buttonContainer.createEl('button', {
            text: 'Annuler'
        }).addEventListener('click', () => {
            this.onConfirm(null);
            this.close();
        });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}
