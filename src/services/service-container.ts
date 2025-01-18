import { App } from "obsidian";
import { VaultMapperService } from "./vault-mapper.service";
import { DocumentStructureService } from "./document-structure.service";
import { KnowledgeDiffusionService } from "./diffusion/knowledge-diffusion.service";
import { FilePathService } from "./diffusion/file-path.service";
import { OpenAIModelService } from "./openai-model.service";
import { NoteSummarizationService } from "./note-summarization.service";
import { ContentFusionService } from "./content-fusion.service";
import { DocumentCleaningService } from "./diffusion/document-cleaning.service";
import { TranscriptFileService } from "./replacement/transcript-file.service";
import { TranscriptionReplacementService } from "./replacement/transcription-replacement.service";
import { ReplacementSpecsParsingService } from "./replacement/replacement-specs-parsing.service";
import { EditorTranscriptionReplacementService } from "./replacement/editor-transcription-replacement.service";
import { DocumentTranslationService } from "./translation/document-translation.service";

export class ServiceContainer {
    private static instance: ServiceContainer;

    // Service instances
    public readonly openAIModelService: OpenAIModelService;
    public readonly noteSummarizationService: NoteSummarizationService;
    public readonly contentFusionService: ContentFusionService;
    public readonly vaultMapperService: VaultMapperService;
    public readonly documentStructureService: DocumentStructureService;
    public readonly filePathService: FilePathService;
    public readonly knowledgeDiffusionService: KnowledgeDiffusionService;
    public readonly documentCleaningService: DocumentCleaningService;
    public readonly transcriptFileService: TranscriptFileService;
    public readonly transcriptionReplacementService: TranscriptionReplacementService;
    public readonly yamlBlockService: ReplacementSpecsParsingService;
    public readonly editorTranscriptionReplacementService: EditorTranscriptionReplacementService;
    public readonly documentTranslationService: DocumentTranslationService;

    private constructor(private app: App) {
        // Initialize services in dependency order
        this.documentCleaningService = new DocumentCleaningService();
        this.openAIModelService = new OpenAIModelService();
        this.noteSummarizationService = new NoteSummarizationService(this.openAIModelService);
        this.contentFusionService = new ContentFusionService(this.openAIModelService);
        this.vaultMapperService = new VaultMapperService(this.app.vault);
        this.documentStructureService = new DocumentStructureService();
        this.filePathService = new FilePathService();
        this.transcriptFileService = new TranscriptFileService();
        this.transcriptionReplacementService = new TranscriptionReplacementService();
        this.yamlBlockService = new ReplacementSpecsParsingService();
        this.editorTranscriptionReplacementService = new EditorTranscriptionReplacementService(
            this.app,
            this.documentStructureService,
            this.yamlBlockService,
            this.transcriptionReplacementService
        );
        this.documentTranslationService = new DocumentTranslationService(this.openAIModelService);
        this.knowledgeDiffusionService = new KnowledgeDiffusionService(
            this.contentFusionService,
            this.filePathService
        );
    }

    static initialize(app: App): ServiceContainer {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer(app);
        }
        return ServiceContainer.instance;
    }

    static getInstance(): ServiceContainer {
        if (!ServiceContainer.instance) {
            throw new Error('ServiceContainer not initialized');
        }
        return ServiceContainer.instance;
    }

    // Add initialization methods that need to be called after plugin settings are loaded
    async initializeWithSettings(settings: any): Promise<void> {
        this.openAIModelService.initialize(settings.openAIApiKey);
    }
}
