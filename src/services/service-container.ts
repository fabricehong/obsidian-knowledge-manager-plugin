import { App } from 'obsidian';
import { ContentFusionService } from './diffusion/content-fusion.service';
import { VaultMapperService } from './vault-mapper.service';
import { FilePathService } from './diffusion/file-path.service';
import { DocumentCleaningService } from './diffusion/document-cleaning.service';
import { TranscriptionReplacementService } from './replacement/apply-replacement/transcription-replacement.service';
import { YamlService } from './document/yaml.service'; 
import { EditorTranscriptionReplacementService } from './replacement/apply-replacement/editor-transcription-replacement.service';
import { EditorVocabularyReplacementService } from './vocabulary/editor-vocabulary-replacement.service';
import { GlossaryReplacementService } from './replacement/specs-creation/glossary-replacement.service';
import { KnowledgeDiffusionService } from './diffusion/knowledge-diffusion.service';
import { TextCorrector } from './vocabulary/textCorrector';
import { DoubleMetaphoneAlgorithm } from './vocabulary/doubleMetaphone';
import { AICompletionService } from '@obsidian-utils/services/interfaces/ai-completion.interface';
import { GlossarySearchService } from "./glossary/glossary-search.service";
import { PluginSettings } from '../settings/settings';
import { DocumentationService } from './documentation/documentation.service';
import { EditorDocumentationService } from './documentation/editor-documentation.service';
import { ConversationTopicsService } from './conversation/conversation-topics.service';
import { EditorConversationTopicsService } from './conversation/editor-conversation-topics.service';
import { ReplacementSpecs, ReplacementSpecsSchema, VocabularySpecSchema, VocabularySpecs } from '../models/schemas';
import { TranscriptFileService } from './transcription-section/transcript-file.service';
import { NoteSummarizationService } from './others/note-summarization.service';
import { DocumentStructureService } from './document/document-structure.service';
import { ReplacementSpecsIntegrationService } from './replacement/replacement-diffusion/replacement-specs-integration.service';
import { TaggedFilesService } from './document/tagged-files.service';
import { EditorReplacementSpecsIntegrationService } from './replacement/replacement-diffusion/editor-replacement-specs-integration.service';
import { EditorReplacementSpecsCreationService } from './replacement/specs-creation/editor-replacement-specs-creation.service';
import { EditorAIReplacementSpecsCreationService } from './replacement/specs-creation/editor-ai-replacement-specs-creation.service';
import { EditorReplacementSpecsStorageService } from './replacement/editor-replacement-specs-storage.service';
import { EditorVocabularySpecsStorageService } from './replacement/editor-vocabulary-specs-storage.service';
import { EditorDocumentService } from './document/editor-document.service';
import { EditorDocumentCleaningService } from './diffusion/editor-document-cleaning.service';
import { EditorKnowledgeDiffusionService } from './diffusion/editor-knowledge-diffusion.service';
import { DocumentModificationService } from './document/document-modification-utils';
import { EditorTranscriptCopyService } from './transcription-section/editor-transcript-copy.service';
import { TranscriptionService } from './transcription/transcription.service';
import { EditorTranscriptionService } from './transcription/editor-transcription.service';
import { EditorLiveTranscriptionService } from './transcription/editor-live-transcription.service';
import { SpeakerDescriptionService } from './speaker-description/speaker-description.service';
import { EditorSpeakerDescriptionService } from './speaker-description/editor-speaker-description.service';
import { LangChain2Service } from './others/LangChain2.service';
import { LangChainCompletionService } from '@obsidian-utils/services/llm/langchain-completion.service';
import KnowledgeManagerPlugin from '../main';
import { MultiTechniqueIndexerImpl } from '../semantic/indexing/MultiTechniqueIndexerImpl';
import { BatchIndexableChunkIndexerImpl } from '../semantic/indexing/BatchIndexableChunkIndexerImpl';
import { ChunkTransformService } from '../semantic/indexing/ChunkTransformService';
import { VectorStore } from '../semantic/vector-store/VectorStore';
import { ContextualizedChunkTransformService } from '../semantic/indexing/ContextualizedChunkTransformService';
import { Papa } from 'papa-ts';
import { LangChainMemoryVectorStore } from '../semantic/vector-store/LangChainMemoryVectorStore';
import { EditorChunkingService } from './semantic/editor-chunking.service';
import { EditorChunkInsertionService } from './semantic/editor-chunk-insertion.service';
import { OpenAIModelService } from './llm/openai-model.service';
import { OpenAIEmbeddings } from '@langchain/openai';

export class ServiceContainer {
    public readonly editorChunkingService: EditorChunkingService;
    public readonly editorChunkInsertionService: EditorChunkInsertionService;
    public readonly documentStructureService: DocumentStructureService;
    public readonly yamlReplacementService: YamlService<ReplacementSpecs>;
    public readonly yamlVocabularyService: YamlService<VocabularySpecs>;
    public readonly transcriptFileService: TranscriptFileService;
    public readonly filePathService: FilePathService;
    public readonly documentCleaningService: DocumentCleaningService;
    public readonly glossaryReplacementService: GlossaryReplacementService;
    public readonly openAIModelService: OpenAIModelService;
    public readonly aiCompletionService: AICompletionService;
    public readonly noteSummarizationService: NoteSummarizationService;
    public readonly contentFusionService: ContentFusionService;
    public readonly vaultMapperService: VaultMapperService;
    public readonly editorTranscriptionReplacementService: EditorTranscriptionReplacementService;
    public readonly editorVocabularyReplacementService: EditorVocabularyReplacementService;
    public readonly glossarySearchService: GlossarySearchService;
    public readonly knowledgeDiffusionService: KnowledgeDiffusionService;
    public readonly transcriptionReplacementService: TranscriptionReplacementService;
    public readonly documentationService: DocumentationService;
    public readonly conversationTopicsService: ConversationTopicsService;
    public readonly replacementSpecsIntegrationService: ReplacementSpecsIntegrationService;
    public readonly editorReplacementSpecsStorageService: EditorReplacementSpecsStorageService;
    public readonly taggedFilesService: TaggedFilesService;
    public readonly editorReplacementSpecsIntegrationService: EditorReplacementSpecsIntegrationService;
    public readonly editorReplacementSpecsCreationService: EditorReplacementSpecsCreationService;
    public readonly editorAIReplacementSpecsCreationService: EditorAIReplacementSpecsCreationService;
    public readonly editorDocumentationService: EditorDocumentationService;
    public readonly editorConversationTopicsService: EditorConversationTopicsService;
    public readonly editorDocumentCleaningService: EditorDocumentCleaningService;
    public readonly editorKnowledgeDiffusionService: EditorKnowledgeDiffusionService;
    public readonly documentModificationService: DocumentModificationService;
    public readonly editorVocabularySpecsStorageService: EditorVocabularySpecsStorageService;
    public readonly editorTranscriptCopyService: EditorTranscriptCopyService;
    public readonly transcriptionService: TranscriptionService;
    public readonly editorTranscriptionService: EditorTranscriptionService;
    public readonly editorLiveTranscriptionService: EditorLiveTranscriptionService;
    public readonly speakerDescriptionService: SpeakerDescriptionService;
    public readonly editorSpeakerDescriptionService: EditorSpeakerDescriptionService;
    private readonly editorDocumentService: EditorDocumentService;
    private readonly textCorrector: TextCorrector;
    public readonly langChain2Service: LangChain2Service;
    public readonly multiTechniqueIndexer: MultiTechniqueIndexerImpl;
    public readonly batchIndexableChunkIndexer: BatchIndexableChunkIndexerImpl;
    public readonly chunkTransformServices: ChunkTransformService[];
    public readonly vectorStores: VectorStore[];
    public readonly papa: Papa;
    public readonly langChainMemoryVectorStore: LangChainMemoryVectorStore;
    // Ajouter d'autres VectorStore mémoire ici si besoin


    constructor(private app: App, settings: PluginSettings, private plugin: KnowledgeManagerPlugin) {
        // Services sans dépendances
        this.documentStructureService = new DocumentStructureService();
        this.yamlReplacementService = new YamlService<ReplacementSpecs>(ReplacementSpecsSchema, 'Invalid replacement specs');
        this.yamlVocabularyService = new YamlService<VocabularySpecs>(VocabularySpecSchema, 'Invalid vocabulary specs');
        this.transcriptFileService = new TranscriptFileService();
        this.filePathService = new FilePathService();
        this.documentCleaningService = new DocumentCleaningService();
        this.glossaryReplacementService = new GlossaryReplacementService();
        this.vaultMapperService = new VaultMapperService(this.app.vault);
        this.transcriptionReplacementService = new TranscriptionReplacementService();
        this.replacementSpecsIntegrationService = new ReplacementSpecsIntegrationService();
        this.taggedFilesService = new TaggedFilesService(this.app);
        this.editorReplacementSpecsStorageService = new EditorReplacementSpecsStorageService(
            this.app,
            this.yamlReplacementService,
            this.taggedFilesService,
            this.documentStructureService,
            settings.replacementsHeader
        );
        this.editorDocumentService = new EditorDocumentService(
            this.app,
            this.documentStructureService
        );
        this.transcriptionService = new TranscriptionService();
        if (settings.assemblyAiApiKey) {
            this.transcriptionService.setApiKey(settings.assemblyAiApiKey);
        }

        this.editorTranscriptionService = new EditorTranscriptionService(
            this.plugin,
            this.transcriptionService,
            settings.transcriptionFolder
        );

        // Ajout du service de stockage pour le vocabulaire
        this.editorVocabularySpecsStorageService = new EditorVocabularySpecsStorageService(
            this.app,
            this.taggedFilesService,
            settings.vocabularySpecsTag,
            this.yamlVocabularyService
        );

        // Services avec LLM
        const selectedConfig = settings.llmConfigurations.find(c => c.id === settings.selectedLlmConfiguration);
        if (!selectedConfig) {
            throw new Error('Selected LLM configuration not found');
        }
        
        const organization = settings.llmOrganizations.find(o => o.id === selectedConfig.organisationId);
        if (!organization) {
            throw new Error('Organization not found for selected configuration');
        }

        this.openAIModelService = new OpenAIModelService();
        this.openAIModelService.initialize(organization.apiKey);
        // Pour LangChain (OpenAIEmbeddings), on définit l'API key globalement
        if (organization.apiKey) {
            process.env.OPENAI_API_KEY = organization.apiKey;
        }

        /*
        this.aiCompletionService = new LLMCompletionService({
            organization,
            configuration: selectedConfig
        }, true);
        */

        this.aiCompletionService = new LangChainCompletionService({
            organization,
            configuration: selectedConfig
        }, true);

        // Text corrector
        this.textCorrector = new TextCorrector(
            new DoubleMetaphoneAlgorithm(),
            0.7,
            0,
            0.4,
            false
        );

        // Services dépendants
        this.noteSummarizationService = new NoteSummarizationService(this.openAIModelService);
        this.contentFusionService = new ContentFusionService(this.openAIModelService);
        
        this.editorTranscriptionReplacementService = new EditorTranscriptionReplacementService(
            this.app,
            this.documentStructureService,
            this.yamlReplacementService,
            this.transcriptionReplacementService,
            this.taggedFilesService
        );
        
        this.editorVocabularyReplacementService = new EditorVocabularyReplacementService(
            this.app,
            this.documentStructureService,
            this.transcriptionReplacementService,
            this.yamlVocabularyService,
            this.yamlReplacementService,
            this.textCorrector,
            this.taggedFilesService,
            this.editorVocabularySpecsStorageService,
            this.editorReplacementSpecsStorageService
        );

        this.knowledgeDiffusionService = new KnowledgeDiffusionService(
            this.contentFusionService,
            this.filePathService
        );

        this.documentationService = new DocumentationService(this.aiCompletionService);
        this.editorDocumentationService = new EditorDocumentationService(
            this.app,
            this.documentStructureService,
            this.documentationService
        );

        this.conversationTopicsService = new ConversationTopicsService(this.aiCompletionService);
        this.editorConversationTopicsService = new EditorConversationTopicsService(
            this.app,
            this.documentStructureService,
            this.conversationTopicsService
        );

        this.glossarySearchService = new GlossarySearchService(
            this.aiCompletionService,
            true
        );

        this.editorReplacementSpecsIntegrationService = new EditorReplacementSpecsIntegrationService(
            this.app,
            this.yamlReplacementService,
            this.editorReplacementSpecsStorageService,
            this.documentStructureService,
            this.replacementSpecsIntegrationService,
            this.taggedFilesService
        );

        this.editorReplacementSpecsCreationService = new EditorReplacementSpecsCreationService(
            this.transcriptFileService,
            this.editorDocumentService,
            this.yamlReplacementService
        );

        this.documentModificationService = new DocumentModificationService(
            this.yamlReplacementService
        );

        this.editorAIReplacementSpecsCreationService = new EditorAIReplacementSpecsCreationService(
            this.app,
            this.documentStructureService,
            this.yamlReplacementService,
            this.glossarySearchService,
            this.glossaryReplacementService,
            this.documentModificationService
        );

        this.editorDocumentCleaningService = new EditorDocumentCleaningService(
            this.app,
            this.documentStructureService,
            this.documentCleaningService
        );

        this.editorKnowledgeDiffusionService = new EditorKnowledgeDiffusionService(
            this.app,
            this.documentStructureService,
            this.knowledgeDiffusionService
        );

        this.editorTranscriptCopyService = new EditorTranscriptCopyService(
            this.app,
            this.documentStructureService,
            settings.headerContainingTranscript
        );

        this.editorLiveTranscriptionService = new EditorLiveTranscriptionService(
            settings.assemblyAiApiKey
        );

        this.speakerDescriptionService = new SpeakerDescriptionService(this.aiCompletionService);
        this.editorSpeakerDescriptionService = new EditorSpeakerDescriptionService(
            this.app,
            this.documentStructureService,
            this.speakerDescriptionService
        );
        this.langChain2Service = new LangChain2Service();
        this.multiTechniqueIndexer = new MultiTechniqueIndexerImpl();
        this.batchIndexableChunkIndexer = new BatchIndexableChunkIndexerImpl();
        // Liste des techniques de transformation disponibles (à enrichir selon besoins)
        this.chunkTransformServices = [
            new ContextualizedChunkTransformService(),
            // Ajouter d'autres implémentations ici
        ];
        // Instanciation unique de Papa (partagée)
        this.papa = new Papa();
        // Initialisation de Papa avec les bons modèles

        // Initialisation synchrone (à adapter si besoin d'async)
        // Exemple : VectorStore mémoire OpenAI (ne reçoit QUE l'instance papa déjà initialisée)
        const embeddings = new OpenAIEmbeddings({ openAIApiKey: organization.apiKey });
        this.langChainMemoryVectorStore = new LangChainMemoryVectorStore(embeddings);
        // Pour Ollama :
        // this.papaMemoryVectorStoreOllama = new PapaMemoryVectorStore(
        //     this.papa,
        //     OllamaEmbedModel.NOMIC_EMBED_TEXT,
        //     OllamaGenModel.LLAMA2
        // );

        // Liste des vector stores disponibles (à enrichir selon besoins)
        this.vectorStores = [
            this.langChainMemoryVectorStore,
            // Ajouter d'autres VectorStore ici
        ];

        // Ajout des services de chunking et d'insertion de chunk
        this.editorChunkingService = new EditorChunkingService(this.app);
        this.editorChunkInsertionService = new EditorChunkInsertionService(this.app);
    }
}
