import { MarkdownView, Notice } from "obsidian";
import { ReplacementSpecs } from "../../../models/schemas";
import { YamlService } from "../../document/yaml.service";
import { EditorDocumentService } from "../../document/editor-document.service";
import { TranscriptFileService } from "../../transcription/transcript-file.service";
import { createReplacementSpecsFromSpeakers } from "./speakers-specs-creator";

export class EditorReplacementSpecsCreationService {
    constructor(
        private transcriptFileService: TranscriptFileService,
        private editorTranscriptionService: EditorDocumentService,
        private yamlService: YamlService<ReplacementSpecs>
    ) {}

    async createReplacementSpecsFromSpeakers(
        markdownView: MarkdownView,
        headerContainingTranscript: string,
        replacementsHeader: string
    ): Promise<void> {
        const doc = await this.editorTranscriptionService.getDocument(markdownView);
        const transcriptContent = await this.editorTranscriptionService.getHeaderContent(doc, headerContainingTranscript);

        this.editorTranscriptionService.checkHeaderNotInDocument(doc, replacementsHeader);

        // Créer les specs à partir des speakers
        const interventions = this.transcriptFileService.parseTranscript(transcriptContent);
        const speakers = this.transcriptFileService.getUniqueSpeakers(interventions);
        const specs = createReplacementSpecsFromSpeakers(speakers);
        
        // Convertir en YAML et ajouter au document
        const yamlContent = this.yamlService.toYaml(specs);
        const codeBlock = this.yamlService.toYamlBlock(yamlContent);
        this.editorTranscriptionService.addHeaderToDocument(doc, replacementsHeader, codeBlock);

        // Sauvegarder les modifications
        await this.editorTranscriptionService.writeDocument(doc);
        new Notice('Added replacements section');
    }
}
