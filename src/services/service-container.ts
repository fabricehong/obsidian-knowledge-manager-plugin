import { App } from 'obsidian';
import { ContentFusionService } from './diffusion/content-fusion.service';
import { VaultMapperService } from './vault-mapper.service';
import { FilePathService } from './diffusion/file-path.service';
import { DocumentCleaningService } from './diffusion/document-cleaning.service';
import { TranscriptionReplacementService } from './replacement/transcription-replacement.service';
import { YamlService } from './document/yaml.service'; 
import { EditorTranscriptionReplacementService } from './replacement/editor-transcription-replacement.service';
import { EditorVocabularyReplacementService } from './vocabulary/editor-vocabulary-replacement.service';
import { GlossaryReplacementService } from './replacement/glossary-replacement.service';
import { KnowledgeDiffusionService } from './diffusion/knowledge-diffusion.service';
import { TextCorrector } from './vocabulary/textCorrector';
import { DoubleMetaphoneAlgorithm } from './vocabulary/doubleMetaphone';
import { AICompletionService } from './interfaces/ai-completion.interface';
import { GlossarySearchService } from "./glossary/glossary-search.service";
import { PluginSettings } from '../settings/settings';
import { DocumentationService } from './documentation/documentation.service';
import { ConversationTopicsService } from './conversation/conversation-topics.service';
import { ReplacementSpecs, ReplacementSpecsSchema, VocabularySpecSchema, VocabularySpecs } from '../models/schemas';
import { TranscriptFileService } from './transcription/transcript-file.service';
import { NoteSummarizationService } from './others/note-summarization.service';
import { DocumentStructureService } from './document/document-structure.service';
import { OpenAICompletionService } from './llm/openai-completion.service';
import { OpenAIModelService } from './llm/openai-model.service';
import { ReplacementSpecsIntegrationService } from './replacement/replacement-diffusion/replacement-specs-integration.service';
import { TaggedFilesService } from './document/tagged-files.service';
import { EditorReplacementSpecsIntegrationService } from './replacement/replacement-diffusion/editor-replacement-specs-integration.service';

export class ServiceContainer {
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
    public readonly taggedFilesService: TaggedFilesService;
    public readonly editorReplacementSpecsIntegrationService: EditorReplacementSpecsIntegrationService;
    private readonly textCorrector: TextCorrector;

    constructor(private app: App, settings: PluginSettings) {
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

        // Services avec OpenAI
        this.openAIModelService = new OpenAIModelService();
        this.openAIModelService.initialize(settings.openAIApiKey);
        
        this.aiCompletionService = new OpenAICompletionService(true);
        this.aiCompletionService.initialize(settings.openAIApiKey);

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
            this.taggedFilesService
        );

        this.knowledgeDiffusionService = new KnowledgeDiffusionService(
            this.contentFusionService,
            this.filePathService
        );

        this.documentationService = new DocumentationService(this.aiCompletionService);
        this.conversationTopicsService = new ConversationTopicsService(this.aiCompletionService);

        this.glossarySearchService = new GlossarySearchService(
            this.aiCompletionService,
            true
        );

        this.editorReplacementSpecsIntegrationService = new EditorReplacementSpecsIntegrationService(
            this.app,
            this.documentStructureService,
            this.yamlReplacementService,
            this.replacementSpecsIntegrationService,
            this.taggedFilesService
        );
    }
}
