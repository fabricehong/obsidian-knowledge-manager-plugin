import { App, Modal, Setting } from 'obsidian';
import { ReplacementSpec } from '../../../../models/schemas';
import { ReplacementSpecsIntegrationSummary } from '../replacement-specs-integration.service';
import { ExistingCategory } from '../editor-replacement-specs-integration.service';
import { ReplacementSpecsFile } from '../../../../models/interfaces';

export interface UserIntegrationChoices {
    integrations: {
        targetCategory: string,
        specsToIntegrate: ReplacementSpec[]
    }[];
}

export class ReplacementSpecsAnalysisModal extends Modal {
    private resolvePromise: ((value: UserIntegrationChoices) => void) | null = null;
    
    // Map de spec.target -> boolean pour les specs intégrables
    private integrationChoices = new Map<string, boolean>();
    
    // Map de spec.target -> category pour les specs sans catégorie
    private categoryChoices = new Map<string, string>();

    constructor(
        app: App,
        private analysisResults: ReplacementSpecsIntegrationSummary,
        private existingCategories: string[]
    ) {
        super(app);
    }

    open(): Promise<UserIntegrationChoices> {
        super.open();
        return new Promise<UserIntegrationChoices>((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();

        // Titre
        contentEl.createEl('h2', {text: 'Analyse des specs de remplacement'});

        // Section 1: Specs intégrables
        this.displayIntegrableSpecs(contentEl);

        // Section 2: Specs sans catégorie
        this.displayUnclassifiedSpecs(contentEl);

        // Section 3: Specs déjà intégrées
        this.displayAlreadyIntegratedSpecs(contentEl);

        // Bouton de validation
        new Setting(contentEl)
            .addButton(button => button
                .setButtonText('Valider')
                .setCta()
                .onClick(this.handleValidate)
            );
    }

    private buildUserChoices(): UserIntegrationChoices {
        const result: UserIntegrationChoices = {
            integrations: []
        };

        // Ajouter les specs intégrables sélectionnées
        for (const integration of this.analysisResults.integrations) {
            const selectedSpecs = integration.specsToIntegrate.filter(
                spec => this.integrationChoices.get(spec.target) ?? false
            );
            
            if (selectedSpecs.length > 0) {
                result.integrations.push({
                    targetCategory: integration.targetCategory,
                    specsToIntegrate: selectedSpecs
                });
            }
        }

        // Ajouter les specs avec leur catégorie choisie
        for (const spec of this.analysisResults.needsClassification) {
            const chosenCategory = this.categoryChoices.get(spec.target);
            if (chosenCategory) {
                // Chercher si une intégration pour cette catégorie existe déjà
                let integration = result.integrations.find(
                    i => i.targetCategory === chosenCategory
                );
                
                if (!integration) {
                    integration = {
                        targetCategory: chosenCategory,
                        specsToIntegrate: []
                    };
                    result.integrations.push(integration);
                }
                
                integration.specsToIntegrate.push(spec);
            }
        }

        return result;
    }

    private handleValidate = () => {
        if (this.resolvePromise) {
            this.resolvePromise(this.buildUserChoices());
            this.close();
        }
    };

    private displayIntegrableSpecs(container: HTMLElement) {
        const section = container.createDiv();
        section.createEl('h3', {text: 'Specs intégrables'});

        if (this.analysisResults.integrations.length === 0) {
            section.createEl('p', {
                text: 'Aucune spec intégrable trouvée'
            });
            return;
        }

        for (const integration of this.analysisResults.integrations) {
            section.createEl('h4', {
                text: `Catégorie : ${integration.targetCategory}`
            });

            for (const spec of integration.specsToIntegrate) {
                // Initialiser à true par défaut
                this.integrationChoices.set(spec.target, true);

                new Setting(section)
                    .setName(`${spec.target}`)
                    .setDesc(`Termes : ${spec.toSearch.join(', ')}`)
                    .addToggle(toggle => toggle
                        .setValue(true)
                        .onChange(value => {
                            this.integrationChoices.set(spec.target, value);
                        })
                    );
            }
        }
    }

    private displayUnclassifiedSpecs(container: HTMLElement) {
        const section = container.createDiv();
        section.createEl('h3', {text: 'Specs sans catégorie'});

        if (this.analysisResults.needsClassification.length === 0) {
            section.createEl('p', {
                text: 'Aucune spec sans catégorie trouvée'
            });
            return;
        }

        for (const spec of this.analysisResults.needsClassification) {
            new Setting(section)
                .setName(`${spec.target}`)
                .setDesc(`Termes : ${spec.toSearch.join(', ')}`)
                .addDropdown(dropdown => {
                    // Ajouter une option vide par défaut
                    dropdown.addOption('', 'Choisir une catégorie');
                    
                    // Ajouter toutes les catégories existantes
                    for (const category of this.existingCategories) {
                        dropdown.addOption(category, category);
                    }

                    dropdown.onChange(value => {
                        if (value) {  // Ne pas enregistrer si l'option vide est sélectionnée
                            this.categoryChoices.set(spec.target, value);
                        } else {
                            this.categoryChoices.delete(spec.target);
                        }
                    });
                });
        }
    }

    private displayAlreadyIntegratedSpecs(container: HTMLElement) {
        const section = container.createDiv();
        section.createEl('h3', {text: 'Specs déjà intégrées'});

        if (this.analysisResults.alreadyIntegrated.length === 0) {
            section.createEl('p', {
                text: 'Aucune spec déjà intégrée'
            });
            return;
        }

        for (const {spec, category} of this.analysisResults.alreadyIntegrated) {
            new Setting(section)
                .setName(`${spec.target}`)
                .setDesc(`Déjà intégré dans la catégorie "${category}" avec les termes : ${spec.toSearch.join(', ')}`)
                .setDisabled(true);
        }
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}
