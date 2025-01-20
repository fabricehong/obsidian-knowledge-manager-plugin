import { App } from "obsidian";
import { DoubleMetaphoneAlgorithm } from "../vocabulary/doubleMetaphone";
import { TextCorrector } from "../vocabulary/textCorrector";
import { ContentFusionService } from "./content-fusion.service";
import { DocumentCleaningService } from "./diffusion/document-cleaning.service";
import { FilePathService } from "./diffusion/file-path.service";
import { KnowledgeDiffusionService } from "./diffusion/knowledge-diffusion.service";
import { DocumentStructureService } from "./document-structure.service";
import { NoteSummarizationService } from "./note-summarization.service";
import { OpenAIModelService } from "./openai-model.service";
import { EditorTranscriptionReplacementService } from "./replacement/editor-transcription-replacement.service";
import { EditorVocabularyReplacementService } from "./replacement/editor-vocabulary-replacement.service";
import { TranscriptFileService } from "./replacement/transcript-file.service";
import { TranscriptionReplacementService } from "./replacement/transcription-replacement.service";
import { YamlReplacementService } from "./replacement/yaml-replacement.service";
import { YamlVocabularyService } from "./replacement/yaml-vocabulary.service";
import { VaultMapperService } from "./vault-mapper.service";

export class ServiceContainer {
    private static instance: ServiceContainer;
    public readonly openAIModelService: OpenAIModelService;
    public readonly noteSummarizationService: NoteSummarizationService;
    public readonly contentFusionService: ContentFusionService;
    public readonly vaultMapperService: VaultMapperService;
    public readonly documentStructureService: DocumentStructureService;
    public readonly filePathService: FilePathService;
    public readonly documentCleaningService: DocumentCleaningService;
    public readonly transcriptFileService: TranscriptFileService;
    public readonly transcriptionReplacementService: TranscriptionReplacementService;
    public readonly yamlReplacementService: YamlReplacementService;
    public readonly yamlVocabularyService: YamlVocabularyService;
    public readonly editorTranscriptionReplacementService: EditorTranscriptionReplacementService;
    public readonly editorVocabularyReplacementService: EditorVocabularyReplacementService;
    public readonly knowledgeDiffusionService: KnowledgeDiffusionService;
    private readonly textCorrector: TextCorrector;

    private constructor(private app: App) {
        // Initialize services in dependency order
        this.documentStructureService = new DocumentStructureService();
        this.yamlReplacementService = new YamlReplacementService();
        this.yamlVocabularyService = new YamlVocabularyService(this.app);
        this.transcriptionReplacementService = new TranscriptionReplacementService();
        this.textCorrector = new TextCorrector(
            new DoubleMetaphoneAlgorithm(),  // phoneticAlgorithm
            0.7,   // threshold
            0,   // stringWeight
            0.4,   // lengthWeight
            false  // debug
        );
        this.editorTranscriptionReplacementService = new EditorTranscriptionReplacementService(
            this.app,
            this.transcriptionReplacementService,
            this.documentStructureService,
            this.yamlReplacementService,
        );
        this.editorVocabularyReplacementService = new EditorVocabularyReplacementService(
            this.app,
            this.documentStructureService,
            this.yamlVocabularyService,
            this.transcriptionReplacementService,
            this.yamlReplacementService,
            this.textCorrector
        );
        this.documentCleaningService = new DocumentCleaningService();
        this.openAIModelService = new OpenAIModelService();
        this.noteSummarizationService = new NoteSummarizationService(this.openAIModelService);
        this.contentFusionService = new ContentFusionService(this.openAIModelService);
        this.vaultMapperService = new VaultMapperService(this.app.vault);
        this.filePathService = new FilePathService();
        this.transcriptFileService = new TranscriptFileService();
        this.knowledgeDiffusionService = new KnowledgeDiffusionService(
            this.contentFusionService,
            this.filePathService
        );
    }

    public static getInstance(app: App): ServiceContainer {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer(app);
        }
        return ServiceContainer.instance;
    }

    // Add initialization methods that need to be called after plugin settings are loaded
    public async initializeWithSettings(settings: any): Promise<void> {
        this.openAIModelService.initialize(settings.openAIApiKey);
    }
}
