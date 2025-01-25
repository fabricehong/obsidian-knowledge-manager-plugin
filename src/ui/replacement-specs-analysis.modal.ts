import { App, Modal } from 'obsidian';
import { ReplacementSpecsIntegrationSummary } from '../services/replacement/replacement-diffusion/replacement-specs-integration.service';

export class ReplacementSpecsAnalysisModal extends Modal {
    constructor(
        app: App,
        private analysisResults: ReplacementSpecsIntegrationSummary
    ) {
        super(app);
    }

    onOpen() {
        const {contentEl} = this;
        
        // Header
        const headerDiv = contentEl.createDiv({ cls: 'replacement-specs-analysis-header' });
        headerDiv.createEl('h2', { text: 'Analyse des specs' });
        headerDiv.createEl('p', { 
            text: `${this.analysisResults.analyzedFilesCount} fichiers analysés`
        });

        // Contenu
        const contentDiv = contentEl.createDiv({ cls: 'replacement-specs-analysis-content' });

        // Section 1: Specs intégrables
        this.displayIntegrableSpecs(contentDiv);

        // Section 2: Specs déjà intégrées
        this.displayAlreadyIntegratedSpecs(contentDiv);

        // Section 3: Specs sans correspondance
        this.displayNoMatchSpecs(contentDiv);
    }

    private displayIntegrableSpecs(container: HTMLElement) {
        const section = container.createDiv();
        section.createEl('h3', {text: 'Specs intégrables'});

        if (this.analysisResults.integrations.length === 0) {
            section.createEl('p', {text: 'Aucune spec intégrable trouvée'});
            return;
        }

        const list = section.createEl('ul');
        for (const integration of this.analysisResults.integrations) {
            const item = list.createEl('li');
            item.createSpan({
                text: `Les specs suivantes peuvent être intégrées dans la catégorie "${integration.targetCategory}" :`
            });

            const subList = item.createEl('ul');
            for (const spec of integration.specsToIntegrate) {
                const subItem = subList.createEl('li');
                subItem.createSpan({
                    text: `"${spec.target}" avec les termes : ${spec.toSearch.join(', ')}`
                });
            }
        }
    }

    private displayAlreadyIntegratedSpecs(container: HTMLElement) {
        const section = container.createDiv();
        section.createEl('h3', {text: 'Specs déjà intégrées'});

        if (this.analysisResults.alreadyIntegrated.length === 0) {
            section.createEl('p', {text: 'Aucune spec déjà intégrée'});
            return;
        }

        const list = section.createEl('ul');
        for (const integration of this.analysisResults.alreadyIntegrated) {
            const item = list.createEl('li');
            item.createSpan({
                text: `"${integration.spec.target}" est déjà intégré dans la catégorie "${integration.category}"`
            });
        }
    }

    private displayNoMatchSpecs(container: HTMLElement) {
        const section = container.createDiv();
        section.createEl('h3', {text: 'Specs sans correspondance'});

        if (this.analysisResults.needsClassification.length === 0) {
            section.createEl('p', {text: 'Aucune spec sans correspondance'});
            return;
        }

        const list = section.createEl('ul');
        for (const spec of this.analysisResults.needsClassification) {
            const item = list.createEl('li');
            item.createSpan({
                text: `"${spec.target}" n'a pas de correspondance dans les specs existantes`
            });
        }
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}
