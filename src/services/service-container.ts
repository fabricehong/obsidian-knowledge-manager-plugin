import { App, TFile, TAbstractFile } from 'obsidian';
import { OpenAIModelService } from '../llm/openai-model.service';
import { OpenAICompletionService } from '../llm/openai-completion.service';
import { NoteSummarizationService } from '../others/note-summarization.service';
import { ContentFusionService } from './diffusion/content-fusion.service';
import { VaultMapperService } from './vault-mapper.service';
import { DocumentStructureService } from '../document/document-structure.service';
import { FilePathService } from './diffusion/file-path.service';
import { DocumentCleaningService } from './diffusion/document-cleaning.service';
import { TranscriptFileService } from '../transcription/transcript-file.service';
import { TranscriptionReplacementService } from './replacement/transcription-replacement.service';
import { YamlReplacementService } from './replacement/yaml-replacement.service';
import { YamlVocabularyService } from '../vocabulary/yaml-vocabulary.service';
import { EditorTranscriptionReplacementService } from './replacement/editor-transcription-replacement.service';
import { EditorVocabularyReplacementService } from '../vocabulary/editor-vocabulary-replacement.service';
import { GlossaryReplacementService } from './replacement/glossary-replacement.service';
import { KnowledgeDiffusionService } from './diffusion/knowledge-diffusion.service';
import { TextCorrector } from '../vocabulary/textCorrector';
import { DoubleMetaphoneAlgorithm } from '../vocabulary/doubleMetaphone';
import { AICompletionService } from './interfaces/ai-completion.interface';
import { GlossarySearchService } from "../glossary/glossary-search.service";
import { PluginSettings } from '../types/settings';

export class ServiceContainer {
    public readonly documentStructureService: DocumentStructureService;
    public readonly yamlReplacementService: YamlReplacementService;
    public readonly transcriptFileService: TranscriptFileService;
    public readonly filePathService: FilePathService;
    public readonly documentCleaningService: DocumentCleaningService;
    public readonly glossaryReplacementService: GlossaryReplacementService;
    public readonly openAIModelService: OpenAIModelService;
    public readonly aiCompletionService: AICompletionService;
    public readonly noteSummarizationService: NoteSummarizationService;
    public readonly contentFusionService: ContentFusionService;
    public readonly vaultMapperService: VaultMapperService;
    public readonly yamlVocabularyService: YamlVocabularyService;
    public readonly editorTranscriptionReplacementService: EditorTranscriptionReplacementService;
    public readonly editorVocabularyReplacementService: EditorVocabularyReplacementService;
    public readonly glossarySearchService: GlossarySearchService;
    public readonly knowledgeDiffusionService: KnowledgeDiffusionService;
    public readonly transcriptionReplacementService: TranscriptionReplacementService;
    private readonly textCorrector: TextCorrector;

    constructor(private app: App, settings: PluginSettings) {
        // Services sans dépendances
        this.documentStructureService = new DocumentStructureService();
        this.yamlReplacementService = new YamlReplacementService();
        this.transcriptFileService = new TranscriptFileService();
        this.filePathService = new FilePathService();
        this.documentCleaningService = new DocumentCleaningService();
        this.glossaryReplacementService = new GlossaryReplacementService();
        this.vaultMapperService = new VaultMapperService(this.app.vault);
        this.transcriptionReplacementService = new TranscriptionReplacementService();

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
        this.yamlVocabularyService = new YamlVocabularyService(this.app);
        
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

        this.knowledgeDiffusionService = new KnowledgeDiffusionService(
            this.contentFusionService,
            this.filePathService
        );

        /* Example of how to read template files from the vault
        // Service qui nécessite la lecture de templates
        const initialTemplateFile = this.app.vault.getAbstractFileByPath(settings.glossaryInitialPromptTemplate);
        const iterationTemplateFile = this.app.vault.getAbstractFileByPath(settings.glossaryIterationPromptTemplate);

        let initialTemplate = "";
        let iterationTemplate = "";

        if (initialTemplateFile instanceof TFile && iterationTemplateFile instanceof TFile) {
            // Note: read est synchrone ici, c'est ok car c'est juste à l'initialisation
            initialTemplate = this.app.vault.read(initialTemplateFile as TFile) as unknown as string;
            iterationTemplate = this.app.vault.read(iterationTemplateFile as TFile) as unknown as string;
        }
        */

        this.glossarySearchService = new GlossarySearchService(
            this.aiCompletionService,
            true
        );
    }
}
