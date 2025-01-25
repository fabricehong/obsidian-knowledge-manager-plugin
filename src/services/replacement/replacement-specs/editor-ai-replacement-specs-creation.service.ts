import { App, MarkdownView, Notice } from "obsidian";
import { DocumentStructureService } from "../../document/document-structure.service";
import { YamlService } from "../../document/yaml.service";
import { HeaderNode, RootNode } from "../../../models/interfaces";
import { ReplacementSpecs } from "../../../models/schemas";
import { GlossarySearchService } from "../../glossary/glossary-search.service";
import { GlossaryReplacementService } from "../glossary-replacement.service";

export class EditorAIReplacementSpecsCreationService {
    constructor(
        private app: App,
        private documentStructureService: DocumentStructureService,
        private yamlService: YamlService<ReplacementSpecs>,
        private glossarySearchService: GlossarySearchService,
        private glossaryReplacementService: GlossaryReplacementService
    ) {}

    async createReplacementSpecs(
        markdownView: MarkdownView,
        headerContainingTranscript: string,
        replacementsHeader: string,
        maxGlossaryIterations: number
    ): Promise<void> {
        const file = markdownView.file;
        if (!file) return;

        const content = await this.app.vault.read(file);
        const metadata = this.app.metadataCache.getFileCache(file);
        const doc = this.documentStructureService.buildHeaderTree(metadata!, content);

        if (!this.checkReplacementHeaderInDocument(doc, replacementsHeader)) return;

        // Obtenir le contenu de la transcription
        const transcriptContent = this.getTranscriptContent(doc, headerContainingTranscript);
        if (!transcriptContent) return;

        // Créer les specs à partir de l'IA
        const glossaryTerms = await this.glossarySearchService.findGlossaryTerms(
            transcriptContent,
            maxGlossaryIterations
        );

        // Convertir les termes en specs de remplacement
        const specs = this.glossaryReplacementService.createFromGlossaryTerms(glossaryTerms.termes);
        const yamlContent = this.yamlService.toYaml(specs);

        // Ajouter la section de remplacement
        const replacementHeader: HeaderNode = {
            level: 1,
            heading: replacementsHeader,
            children: [],
            content: yamlContent
        };
        doc.children.unshift(replacementHeader);

        // Ajouter la section glossaire si des termes sont présents
        const glossaryHeader: HeaderNode = {
            level: 1,
            heading: "Glossaire",
            children: [],
            content: glossaryTerms.termes
                .filter(({definition}) => definition.trim() !== '-')
                .map(({terme, definition}) => `- **${terme}** : ${definition.trim()}`)
                .join('\n')
        };
        doc.children.unshift(glossaryHeader);

        // Sauvegarder les modifications
        const newContent = this.documentStructureService.renderToMarkdown(doc);
        await this.app.vault.modify(file, newContent);
        
        new Notice('Added replacements and glossary sections');
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
