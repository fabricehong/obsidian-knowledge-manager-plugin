import { App, MarkdownView, Notice } from "obsidian";
import { DocumentStructureService } from "../../document/document-structure.service";
import { YamlService } from "../../document/yaml.service";
import { HeaderNode, RootNode } from "../../../models/interfaces";
import { ReplacementSpecs } from "../../../models/schemas";
import { GlossarySearchService } from "../../glossary/glossary-search.service";
import { GlossaryReplacementService } from "./glossary-replacement.service";
import { LoadingModal } from "../../../ui/loading.modal";
import { GlossarySpecsSelectionModal } from "./ui/glossary-specs-selection.modal";
import { DocumentModificationService } from "../../document/document-modification-utils";

export class EditorAIReplacementSpecsCreationService {
    constructor(
        private app: App,
        private documentStructureService: DocumentStructureService,
        private yamlService: YamlService<ReplacementSpecs>,
        private glossarySearchService: GlossarySearchService,
        private glossaryReplacementService: GlossaryReplacementService,
        private documentModificationService: DocumentModificationService,
    ) {}

    async createReplacementSpecs(
        markdownView: MarkdownView,
        headerContainingTranscript: string,
        replacementsHeader: string,
        maxGlossaryIterations: number
    ): Promise<void> {
        const file = markdownView.file;
        if (!file) {
            console.log("No file found in markdownView");
            return;
        }

        const content = await this.app.vault.read(file);
        const metadata = this.app.metadataCache.getFileCache(file);
        const doc = this.documentStructureService.buildHeaderTree(metadata!, content);

        if (!this.checkReplacementHeaderInDocument(doc, replacementsHeader)) return;

        // Obtenir le contenu de la transcription
        const transcriptContent = this.getTranscriptContent(doc, headerContainingTranscript);
        if (!transcriptContent) {
            console.log(`No transcript content found in header '${headerContainingTranscript}'`);
            return;
        }

        // Créer les specs à partir du glossaire
        let isCancelled = false;
        const loadingModal = new LoadingModal(this.app, () => {
            isCancelled = true;
        });
        loadingModal.open();

        try {
            const glossaryTerms = await this.glossarySearchService.findGlossaryTerms(
                transcriptContent,
                maxGlossaryIterations
            );
            
            if (isCancelled) {
                new Notice('Operation cancelled');
                return;
            }

            const initialSpecs = this.glossaryReplacementService.createFromGlossaryTerms(glossaryTerms.termes);

            // Afficher la modale de sélection
            const specs = await new Promise<ReplacementSpecs | null>(resolve => {
                new GlossarySpecsSelectionModal(
                    this.app,
                    initialSpecs,
                    selectedSpecs => {
                        resolve(selectedSpecs);
                    }
                ).open();
            });

            // Si annulé ou aucune spec sélectionnée
            if (!specs || specs.replacements.length === 0) {
                new Notice('Opération annulée');
                return;
            }
            
            // Convertir en YAML et ajouter au document
            const yamlContent = this.yamlService.toYaml(specs);
            this.documentModificationService.modifyDocumentWithReplacementHeader(doc, yamlContent, replacementsHeader);

            // Ajouter la section glossaire
            const contentStr = glossaryTerms.termes
                .filter(({definition}) => definition.trim() !== '-')  
                .map(({terme, definition}) => `- **${terme}** : ${definition.trim()}`)
                .join('\n');
            if (!this.documentModificationService.addGlossarySection(doc, contentStr)) {
                console.log("Failed to add glossary section - could not find replacements header");
                return;
            }

            // Sauvegarder les modifications
            const newContent = this.documentStructureService.renderToMarkdown(doc);
            await this.app.vault.modify(file, newContent);
            
            new Notice('Successfully added glossary replacements section');
        } finally {
            loadingModal.forceClose();
        }
    }

    private checkReplacementHeaderInDocument(doc: RootNode, replacementsHeader: string): boolean {
        const replacementNode = this.documentStructureService.findFirstNodeMatchingHeading(doc, replacementsHeader);
        if (replacementNode) {
            new Notice('Replacement section already exists');
            return false;
        }
        return true;
    }

    private getTranscriptContent(doc: RootNode, headerContainingTranscript: string): string | null {
        const transcriptNode = this.documentStructureService.findFirstNodeMatchingHeading(doc, headerContainingTranscript);
        if (!transcriptNode) {
            new Notice('No transcript section found');
            return null;
        }
        return transcriptNode.content;
    }
}
