
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
import { MultiTechniqueChunkTransformer } from './semantic/indexing/MultiTechniqueChunkTransformer';
import { MultiVectorStoreIndexer } from './semantic/indexing/MultiVectorStoreIndexer';
import { ChunkTransformService } from './semantic/indexing/ChunkTransformService';
import { VectorStore } from './semantic/vector-store/VectorStore';
import { ContextualizedChunkTransformService } from './semantic/indexing/ContextualizedChunkTransformService';

import { PersistentOramaVectorStore } from './semantic/vector-store/PersistentOramaVectorStore';
import { join } from 'path';
import { EditorChunkingService } from './semantic/editor-chunking.service';
import { EditorChunkInsertionService } from './semantic/editor-chunk-insertion.service';
import { EditorChunkIndexingService } from './semantic/editor-chunk-indexing.service';
import { MultiSemanticSearchService } from './semantic/search/MultiSemanticSearchService';
import { OpenAIModelService } from './llm/openai-model.service';

import { OllamaEmbeddings } from '@langchain/ollama';
import { ChatService } from './chat/chat.service';
import { getTracer } from './langsmith-tracer';
import { Embeddings } from '@langchain/core/embeddings';
import { randomUUID } from 'crypto';
import { OpenAIEmbeddings } from '@langchain/openai';
import { SemanticSearchService } from './semantic/search/SemanticSearchService';
import { ChatSemanticSearchService } from './semantic/search/ChatSemanticSearchService';






export class ServiceContainer {
    public readonly tracer?: any; // LangChainTracer type, mais évite l'import direct si absent
    /**
     * Identifiant unique pour chaque instance de ServiceContainer
     */
    public readonly serviceContainerId: string;
    public readonly chatService: ChatService; // Service de chat éditeur

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
    public readonly multiTechniqueChunkTransformer: MultiTechniqueChunkTransformer;
    public readonly multiVectorStoreIndexer: MultiVectorStoreIndexer;
    public readonly chunkTransformServices: ChunkTransformService[];
    public readonly vectorStores: VectorStore[];


    // Ajouter d'autres VectorStore mémoire ici si besoin

    public readonly multiSemanticSearchService: MultiSemanticSearchService;
    public readonly chatSemanticSearchService: ChatSemanticSearchService;
    public readonly editorChunkIndexingService: EditorChunkIndexingService;

    static async create(app: App, settings: PluginSettings, plugin: KnowledgeManagerPlugin) {
        // Création de l'instance avec initialisation synchrones
        const container = new ServiceContainer(app, settings, plugin);

        // --- Initialisation vector stores ---
        await container.initVectorStores();
        return container;
    }
    
    constructor(private app: App, settings: PluginSettings, private plugin: KnowledgeManagerPlugin) {
        // Génère un UUID unique pour cette instance
        this.serviceContainerId = randomUUID();
        console.log('creation du service container', this.serviceContainerId);
        console.log('[ServiceContainer.constructor] called', (new Error().stack));
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

        // Initialisation du tracer LangSmith si clé présente
        if (settings.langSmithApiKey) {
            try {
                this.tracer = getTracer(settings.langSmithApiKey);
                console.log('tracer initialisé');
            } catch (e) {
                console.warn('Impossible d’initialiser le tracer LangSmith :', e);
            }
        }

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
        // Liste des techniques de transformation disponibles (à enrichir selon besoins)
        const bestChunkTransformTechnique = new ContextualizedChunkTransformService();
        this.chunkTransformServices = [
            bestChunkTransformTechnique,
            //new RawTextChunkTransformService(),
        ];
        this.multiTechniqueChunkTransformer = new MultiTechniqueChunkTransformer(this.chunkTransformServices);

        // Initialisation synchrone (à adapter si besoin d'async)
        // Exemple : VectorStore mémoire OpenAI (ne reçoit QUE l'instance papa déjà initialisée)

        // Pour Ollama :
        // this.papaMemoryVectorStoreOllama = new PapaMemoryVectorStore(
        //     this.papa,
        //     OllamaEmbedModel.NOMIC_EMBED_TEXT,
        //     OllamaGenModel.LLAMA2
        // --- Modèles Ollama utilisés ---
        //
        // 1. nomic-embed-text
        //    - Polyvalent, open-source, rapide
        //    - Très bon pour la recherche sémantique sur documents variés
        //    - Multilingue (français inclus)
        //    - Idéal pour la plupart des usages Obsidian
        // 2. jeffh/intfloat-multilingual-e5-large-instruct:q8_0
        //    - Modèle multilingue très réputé pour le retrieval et la recherche contextuelle
        //    - Excellente robustesse pour le français et les langues européennes
        //    - Version quantized (q8_0) : rapide, léger, très bon compromis qualité/ressources
        // 3. bge-m3
        //    - Modèle BAAI de dernière génération, multilingue
        //    - Très performant pour la recherche sémantique, supporte bien le français
        //    - Recommandé pour les tâches avancées de vectorisation et de similarité
        //    - Contexte plus grand que les autres
        const embeddingsModels: Embeddings[] = [];

        [
            // 'nomic-embed-text', // Voir description ci-dessus
            // 'jeffh/intfloat-multilingual-e5-large-instruct:q8_0', // Voir description ci-dessus
            'bge-m3', // Voir description ci-dessus
            // 'bge-large',
        ].forEach(element => {
            embeddingsModels.push(new OllamaEmbeddings({
                model: element,
                requestOptions: {
                    num_ctx: 8192,
                }
            }));
        });

        // embeddingsModels.push(new OpenAIEmbeddings({ openAIApiKey: settings.openAIApiKey }));

        this.vectorStores = embeddingsModels.map(
            (model: Embeddings) => {
                // On crée un fichier de persistence unique par modèle
                const safeModelName = (model as any).model?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'unknown';
                const persistencePath = join((this.app.vault.adapter as any).basePath, `vectorstore-orama-${safeModelName}.json`);
                return new PersistentOramaVectorStore(model, persistencePath);
            }
        );

        // Initialisation asynchrone déplacée dans une méthode dédiée

        this.multiVectorStoreIndexer = new MultiVectorStoreIndexer(this.vectorStores);
        // Ajout des services de chunking et d'insertion de chunk
        this.editorChunkingService = new EditorChunkingService(this.app);
        this.editorChunkInsertionService = new EditorChunkInsertionService(this.app);
        this.editorChunkIndexingService = new EditorChunkIndexingService(
            this.app,
            this.editorChunkingService,
            this.multiTechniqueChunkTransformer,
            this.vectorStores
        );
        // Initialisation du service multi-recherche sémantique

        // Prépare la liste alignée des SemanticSearchService pour chaque vectorStore
        const semanticSearchServices = this.vectorStores.map(vs => new SemanticSearchService(vs));

        this.chatSemanticSearchService = new ChatSemanticSearchService(
            semanticSearchServices[0],
            bestChunkTransformTechnique.technique,
        );

        this.multiSemanticSearchService = new MultiSemanticSearchService(
            semanticSearchServices
        );

        try {
            if (!settings.openAIApiKey) throw new Error('Clé OpenAI manquante');
            this.chatService = new ChatService(
                this.chatSemanticSearchService,
                settings.openAIApiKey,
                this.tracer
            );
        } catch (e) {
            console.error('[ServiceContainer] Impossible d\'initialiser chatService:', e);
            // Important : toujours initialiser la propriété
            (this as any).editorChatService = null;
        }

        this.initVectorStores();
    }

    private async initVectorStores() {
        console.log('initVectorStores', this.serviceContainerId);
        await Promise.all(this.vectorStores.map(store => store.init?.()));
    }
}
