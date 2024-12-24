import { App } from "obsidian";
import { VaultMapperService } from "./vault-mapper.service";
import { DocumentStructureService } from "./document-structure.service";
import { KnowledgeDiffusionService } from "./knowledge-diffusion.service";
import { FilePathService } from "./file-path.service";
import { OpenAIModelService } from "./openai-model.service";
import { NoteSummarizationService } from "./note-summarization.service";
import { ContentFusionService } from "./content-fusion.service";

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

    private constructor(private app: App) {
        // Initialize services in dependency order
        this.openAIModelService = new OpenAIModelService();
        this.noteSummarizationService = new NoteSummarizationService(this.openAIModelService);
        this.contentFusionService = new ContentFusionService(this.openAIModelService);
        this.vaultMapperService = new VaultMapperService(this.app.vault);
        this.documentStructureService = new DocumentStructureService();
        this.filePathService = new FilePathService();
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
