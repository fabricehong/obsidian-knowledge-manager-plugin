import { App, MarkdownView, Notice } from "obsidian";
import { DocumentStructureService } from "../../document/document-structure.service";
import { TranscriptFileService } from "../../transcription/transcript-file.service";
import { TranscriptionReplacementService } from "../transcription-replacement.service";
import { YamlService } from "../../document/yaml.service";
import { HeaderNode, RootNode } from "../../../models/interfaces";
import { ReplacementSpecs } from "../../../models/schemas";

export class EditorReplacementSpecsCreationService {
    constructor(
        private app: App,
        private documentStructureService: DocumentStructureService,
        private transcriptFileService: TranscriptFileService,
        private transcriptionReplacementService: TranscriptionReplacementService,
        private yamlService: YamlService<ReplacementSpecs>
    ) {}

    async createReplacementSpecsFromSpeakers(
        markdownView: MarkdownView,
        headerContainingTranscript: string,
        replacementsHeader: string
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

        // Créer les specs à partir des speakers
        const interventions = this.transcriptFileService.parseTranscript(transcriptContent);
        const speakers = this.transcriptFileService.getUniqueSpeakers(interventions);
        const specs = this.transcriptionReplacementService.createFromSpeakers(speakers);
        
        // Convertir en YAML et ajouter au document
        const yamlContent = this.yamlService.toYaml(specs);
        this.modifyDocumentWithReplacementHeader(doc, yamlContent, replacementsHeader);

        // Sauvegarder les modifications
        const newContent = this.documentStructureService.renderToMarkdown(doc);
        await this.app.vault.modify(file, newContent);
        
        new Notice('Added replacements section');
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

    private modifyDocumentWithReplacementHeader(doc: RootNode, yamlContent: string, replacementsHeader: string): void {
        const codeBlock = this.yamlService.toYamlBlock(yamlContent);
        const newHeader: HeaderNode = {
            level: 1,
            heading: replacementsHeader,
            children: [],
            content: codeBlock
        };
        doc.children.unshift(newHeader);
    }
}
