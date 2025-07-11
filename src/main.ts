import { App, Editor, MarkdownRenderer, MarkdownView, Modal, Notice, Plugin, TFile, TFolder } from 'obsidian';
import '../chat-panel.css';
import { ServiceContainer } from './services/service-container';
import { EditorChatPanel, VIEW_TYPE_CHAT } from './services/chat/editor-chat-panel';
import { AgentSuggestModal } from './services/chat/agent/agent-suggest-modal';
import { DEFAULT_SETTINGS, PluginSettings, updateDefaultReferences } from './settings/settings';
import { SettingsTab } from './settings/settings-tab';
import { FolderSuggestModal } from '@obsidian-utils/ui/folder-suggest-modal';
import { TranscriptionModal } from './services/transcription/transcription-modal';
import { QuickLLMConfigModal } from './ui/quick-llm-config.modal';

import { PromptModal } from './services/semantic/ui/PromptModal';
import { ApiStatusBar } from './ui/mcp-status-bar';
import { SemanticSearchApiService } from './services/api/semantic-search-api.service';
import { HttpServerService } from './services/api/http-server.service';

// Génère un header markdown détaillé pour tout vector store (type, modèle, etc)

const HELP_CONTENT = `# Aide - Commandes de Remplacement de Transcript

## Vue d'overview
Les commandes de remplacement de transcript permettent de standardiser les noms et termes utilisés dans vos transcriptions de réunions.

## Commandes disponibles

### Création de specs de remplacement
- \`transcript-replacement:replacement-specs:create:from-speakers\`
  Extrait les noms des intervenants du transcript et crée une section de specs de remplacement. Ces specs peuvent ensuite être appliquées ou publiées dans le vault.

- \`transcript-replacement:replacement-specs:create:from-ai\`
  Alternative utilisant l'IA pour suggérer des specs de remplacement en analysant le transcript. Ces specs peuvent ensuite être appliquées ou publiées.

### Application des remplacements
- \`transcript-replacement:apply:from-specs\`
  Applique les remplacements au transcript en utilisant les specs locales du fichier actif ET celles publiées dans le vault. Les specs locales sont prioritaires.

- \`transcript-replacement:apply:from-vocabulary\`
  Applique directement les remplacements depuis le vocabulaire global, sans passer par les specs. Alternative rapide quand les specs ne sont pas nécessaires.

### Publication des specs
- \`transcript-replacement:replacement-specs:to-vault\`
  Déplace les specs du fichier actif vers le vault pour une utilisation globale. Ces specs seront utilisées par 'apply:from-specs' pour tous les fichiers.

## Workflow typique
1. Créer des specs de remplacement :
   - Soit via \`create:from-speakers\` pour extraire les noms des intervenants
   - Soit via \`create:from-ai\` pour des suggestions basées sur l'IA
2. Vérifier et ajuster les specs générées si nécessaire
3. Appliquer les specs avec \`apply:from-specs\` pour tester localement
4. Si les remplacements sont satisfaisants, utiliser \`to-vault\` pour les rendre disponibles globalement
5. Pour les cas simples, utiliser directement \`apply:from-vocabulary\``;

class HelpModal extends Modal {
	private plugin: KnowledgeManagerPlugin;

	constructor(app: App, plugin: KnowledgeManagerPlugin) {
		super(app);
		this.plugin = plugin;
	}

	async onOpen() {
		let { contentEl } = this;

		// Créer un conteneur pour le contenu markdown
		const markdownContainer = contentEl.createDiv({
			cls: 'markdown-preview-view markdown-rendered'
		});

		// Rendre le markdown
		await MarkdownRenderer.renderMarkdown(
			HELP_CONTENT,
			markdownContainer,
			'',
			this.plugin
		);
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}

export default class KnowledgeManagerPlugin extends Plugin {
    public activeChatPanels = new Set<EditorChatPanel>();
	async activateChatView() {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CHAT);
		if (leaves.length > 0) {
			this.app.workspace.revealLeaf(leaves[0]);
			return;
		}
		const rightLeaf = this.app.workspace.getRightLeaf(false);
		if (rightLeaf) {
			await rightLeaf.setViewState({
				type: VIEW_TYPE_CHAT,
				active: true,
			});
		}
	}

	settings: PluginSettings;
	private serviceContainer: ServiceContainer;
	private statusBarItem: HTMLElement;
	private apiStatusBar: ApiStatusBar;
	private semanticSearchApiService: SemanticSearchApiService;
	private httpServerService: HttpServerService;

	async onload() {
        this.activeChatPanels = new Set<EditorChatPanel>();
		await this.loadSettings();
		this.serviceContainer = await ServiceContainer.create(this.app, this.settings, this);

		// Enregistrement de la vue chat dans le panneau latéral
		this.registerView(
            VIEW_TYPE_CHAT,
            (leaf) => {
                const panel = new EditorChatPanel(leaf, this.serviceContainer.chatService, this);
                this.activeChatPanels.add(panel);
                return panel;
            }
        );

		// Commande pour ouvrir explicitement le panneau de chat IA
		this.addCommand({
			id: 'semantic:chat',
			name: 'semantic:chat',
			callback: () => {
				this.activateChatView();
			}
		});

		// --- Commande Create Chunks ---
		this.addCommand({
			id: 'semantic:print-indexable-chunks',
			name: 'semantic:print-indexable-chunks',
			callback: async () => {
				try {
					await this.printIndexableChunksInActiveFile();
				} catch (error) {
					console.error('Erreur lors de la création des chunks:', error);
					new Notice('Erreur lors de la création des chunks. Voir la console pour plus de détails.');
				}
			}
		});

		// Commande pour tester les embeddings sur tous les vector stores du fichier actif
		this.addCommand({
			id: 'semantic-:test-embeddings-active-file',
			name: 'semantic-:test-embeddings-active-file',
			callback: async () => {
				try {
					await this.serviceContainer.editorChunkIndexingService.testEmbeddingsForActiveFileChunksAllStores();
				} catch (error) {
					console.error('Erreur lors du test des embeddings:', error);
					new Notice('Erreur lors du test des embeddings. Voir la console.');
				}
			}
		});

		// --- Commande Index Chunks ---
		this.addCommand({
			id: 'semantic:vector-store:index-all',
			name: 'semantic:vector-store:index-all',
			callback: async () => {
				try {
					await this.indexChunks();
				} catch (error) {
					console.error('Erreur lors de l\'indexation des chunks:', error);
				}
			}
		});

		// Commande pour afficher tous les documents du vector store mémoire
		this.addCommand({
			id: 'semantic:vector-store:print-all-documents',
			name: 'semantic:vector-store:print-all-documents',
			callback: async () => {
				try {
					await this.printAllVectorStoreDocumentsInActiveFile();
				} catch (error) {
					console.error('Erreur lors de l\'insertion des documents vector store:', error);
					new Notice('Erreur lors de l\'insertion des documents vector store. Voir la console pour plus de détails.');
				}
			}
		});

		// Commande pour la recherche sémantique multi-vector store
		this.addCommand({
			id: 'semantic:vector-store:search-all',
			name: 'semantic:vector-store:search-all',
			callback: async () => {
				try {
					await this.searchInAllVectorStoresAndPrintResults();
				} catch (e) {
					console.error('Erreur lors de la recherche sémantique multi-vector store:', e);
					new Notice('Erreur lors de la recherche sémantique. Voir la console.');
				}
			}
		});

		// Commande pour exporter embeddings + métadonnées pour Embedding Projector
		this.addCommand({
			id: 'semantic:vector-store:export-embedding-projector',
			name: 'semantic:vector-store:export-embedding-projector',
			callback: async () => {
				try {
					await this.serviceContainer.editorEmbeddingExportService.exportEmbeddingsForProjector();
				} catch (error) {
					console.error('Erreur lors de l\'export Embedding Projector:', error);
					new Notice('Erreur lors de l\'export Embedding Projector. Voir la console.');
				}
			}
		});

		this.addCommand({
			id: 'semantic:vector-store:reset',
			name: 'semantic:vector-store:reset',
			callback: async () => {
				await this.resetVectorStores();
			},
		});

		// Ajout de la barre de statut
		this.statusBarItem = this.addStatusBarItem();
		
		// Initialisation des services API
		this.semanticSearchApiService = new SemanticSearchApiService(this.serviceContainer.chatSemanticSearchService);
		this.httpServerService = new HttpServerService(this.semanticSearchApiService);
		
		// Initialisation du status bar API
		this.apiStatusBar = new ApiStatusBar(this.statusBarItem);
		this.apiStatusBar.setOnToggle(() => {
			this.toggleApiServer();
		});

		// Commandes API
		this.addCommand({
			id: 'semantic:start-api-server',
			name: 'semantic:start-api-server',
			callback: () => {
				this.startApiServer();
			}
		});

		this.addCommand({
			id: 'semantic:stop-api-server',
			name: 'semantic:stop-api-server',
			callback: () => {
				this.stopApiServer();
			}
		});

		// Register commands
		this.addCommand({
			id: 'note-dissusion:diffuse-current-note',
			name: 'note-dissusion:diffuse-current-note',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.serviceContainer.editorKnowledgeDiffusionService.diffuseCurrentNote(markdownView);
					}
					return true;
				}
				return false;
			}
		});

		// Add the remove references content command
		this.addCommand({
			id: 'note-diffusion:remove-refs-content',
			name: 'note-diffusion:remove-refs-content',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.serviceContainer.editorDocumentCleaningService.cleanReferenceContent(markdownView);
					}
					return true;
				}
				return false;
			}
		});

		// Add the add replacements section command
		this.addCommand({
			id: 'transcript-replacement:replacement-specs:create:from-speakers',
			name: 'transcript-replacement:replacement-specs:create:from-speakers',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.serviceContainer.editorReplacementSpecsCreationService.createReplacementSpecsFromSpeakers(
							markdownView,
							this.settings.headerContainingTranscript,
							this.settings.replacementsHeader
						);
					}
					return true;
				}
				return false;
			}
		});

		// Add the add glossary replacements section command
		this.addCommand({
			id: 'transcript-replacement:replacement-specs:create:from-ai',
			name: 'transcript-replacement:replacement-specs:create:from-ai',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView && markdownView.file) {
					if (!checking) {
						this.serviceContainer.editorAIReplacementSpecsCreationService.createReplacementSpecs(
							markdownView.file,
							this.settings.headerContainingTranscript,
							this.settings.replacementsHeader,
							this.settings.maxGlossaryIterations
						);
					}
					return true;
				}
				return false;
			}
		});

		// Add the replace transcription command
		this.addCommand({
			id: 'transcript-replacement:apply:from-specs',
			name: 'transcript-replacement:apply:from-specs',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.serviceContainer.editorTranscriptionReplacementService.replaceTranscription(
							markdownView,
							this.settings.replacementSpecsTag,
							this.settings.headerContainingTranscript,
							this.settings.replacementsHeader,
						);
					}
					return true;
				}
				return false;
			}
		});

		// Add vocabulary replacement command
		this.addCommand({
			id: 'transcript-replacement:apply:from-vocabulary',
			name: 'transcript-replacement:apply:from-vocabulary',
			editorCallback: (editor: Editor) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view) {
					this.serviceContainer.editorVocabularyReplacementService.replaceWithVocabulary(
						view,
						this.settings.vocabularySpecsTag,
						this.settings.headerContainingTranscript,
						this.settings.replacementsHeader
					);
				}
			}
		});

		// Add the analyze replacement specs command
		this.addCommand({
			id: 'transcript-replacement:replacement-specs:to-vault',
			name: 'transcript-replacement:replacement-specs:to-vault',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.serviceContainer.editorReplacementSpecsIntegrationService.publishCurrentFileSpecs(
							markdownView,
							this.settings.replacementSpecsTag,
							this.settings.replacementsHeader
						);
					}
					return true;
				}
				return false;
			}
		});

		// Add the create documentation command
		this.addCommand({
			id: 'enrich:create-documentation',
			name: 'enrich:create-documentation',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.serviceContainer.editorDocumentationService.createDocumentation(
							markdownView,
							this.settings.headerContainingTranscript
						);
					}
					return true;
				}
				return false;
			}
		});

		// Add the list conversation topics command
		this.addCommand({
			id: 'enrich:list-conversation-topics',
			name: 'enrich:list-conversation-topics',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.serviceContainer.editorConversationTopicsService.listTopics(
							markdownView,
							this.settings.headerContainingTranscript
						);
					}
					return true;
				}
				return false;
			}
		});

		// Add the describe speakers command
		this.addCommand({
			id: 'enrich:describe-speakers',
			name: 'enrich:describe-speakers',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.serviceContainer.editorSpeakerDescriptionService.describeSpeakers(
							markdownView,
							this.settings.headerContainingTranscript,
							"Speaker description"  // Valeur en dur comme demandé
						);
					}
					return true;
				}
				return false;
			}
		});

		// Add the summarize command
		this.addCommand({
			id: 'debug:summarize-note',
			name: 'debug:summarize-note',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.summarizeNote(markdownView);
					}
					return true;
				}
				return false;
			}
		});

		// Add the map vault command
		this.addCommand({
			id: 'debug:map-vault',
			name: 'debug:map-vault',
			callback: () => {
				new FolderSuggestModal(this.app, (folder: TFolder) => {
					try {
						const vaultMap = this.serviceContainer.vaultMapperService.mapDirectory(folder);
						const stringRepresentation = this.serviceContainer.vaultMapperService.getStringRepresentation(vaultMap);
						console.log(`Structure for folder "${folder.path}":\n${stringRepresentation}`);
						new Notice(`Map generated for "${folder.path}"! Check the console for details.`);
					} catch (error) {
						console.error('Error mapping folder:', error);
						new Notice('Error mapping folder. Check the console for details.');
					}
				}).open();
			}
		});

		// Add the print file cache command
		this.addCommand({
			id: 'debug:print-file-cache',
			name: 'debug:print-file-cache',
			checkCallback: (checking: boolean) => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView?.file) {
					if (!checking) {
						const file = activeView.file;
						const cache = this.app.metadataCache.getFileCache(file);
						if (cache) {
							const headerTree = this.serviceContainer.documentStructureService.buildHeaderTree(this.app, file);
							console.log('Header tree for', file.path + ':', headerTree);
							new Notice('Header tree printed to console');
						} else {
							new Notice('No cache available for this file');
						}
					}
					return true;
				}
				return false;
			}
		});

		// Add command to print translation prompt template
		this.addCommand({
			id: 'debug:print-translation-template',
			name: 'debug:print-translation-template',
			callback: async () => {
				const templatePath = this.settings.translationPromptTemplate;
				if (!templatePath) {
					new Notice('No translation prompt template set in settings');
					return;
				}

				try {
					const file = this.app.vault.getAbstractFileByPath(templatePath);
					if (file instanceof TFile) {
						const content = await this.app.vault.read(file);
						console.log('Translation Prompt Template Content:');
						console.log('----------------------------------------');
						console.log(content);
						console.log('----------------------------------------');
						new Notice('Translation prompt template content printed to console');
					} else {
						new Notice('Template file not found: ' + templatePath);
					}
				} catch (error) {
					console.error('Error reading template file:', error);
					new Notice('Error reading template file');
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingsTab(this.app, this));

		// Add a simple command to test LangChain2Service
		this.addCommand({
			id: 'test-langchain2-service',
			name: 'Test LangChain2 Service',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const selectedConfig = this.settings.llmConfigurations.find(c => c.id === this.settings.selectedLlmConfiguration);
				if (!selectedConfig) {
					new Notice('No LLM configuration selected');
					return;
				}
				const organization = this.settings.llmOrganizations.find(o => o.id === selectedConfig.organisationId);
				if (!organization) {
					new Notice('Organization not found for selected configuration');
					return;
				}
				const apiKey = organization.apiKey;
				const modelName = selectedConfig.model;
				const temperature = 0.7;
				const promptTemplate = "You are a helpful assistant. Please respond to the following question: {text}";
				const text = editor.getSelection() || "What is the capital of France?";

				try {
					await this.serviceContainer.langChain2Service.initialize(apiKey, modelName, temperature, promptTemplate);
					const result = await this.serviceContainer.langChain2Service.run(text);
					new Notice(`LangChain2 Result: ${result}`);
				} catch (error) {
					new Notice(`Error: ${error.message}`);
				}
			}
		});

		// Add the help command
		this.addCommand({
			id: 'transcript-replacement:help',
			name: 'transcript-replacement:help',
			callback: () => {
				try {
					new HelpModal(this.app, this).open();
				} catch (error) {
					console.error('Error showing help:', error);
					new Notice('Erreur lors de l\'affichage de l\'aide');
				}
			}
		});

		// Add the show transcript replacement help command
		// Add the transcript copy command
		this.addCommand({
			id: 'transcript:copy',
			name: 'transcript:copy',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.serviceContainer.editorTranscriptCopyService.copyTranscript(markdownView);
					}
					return true;
				}
				return false;
			}
		});

		// Commande de transcription
		this.addCommand({
			id: 'transcribe-audio',
			name: 'Transcrire un fichier audio',
			callback: () => {
				new TranscriptionModal(this.app, this.serviceContainer.editorTranscriptionService).open();
			}
		});

		this.addCommand({
			id: 'start-live-transcription',
			name: 'Démarrer la transcription en direct',
			editorCallback: async (editor) => {
				await this.serviceContainer.editorLiveTranscriptionService.startTranscription(editor);
			}
		});

		this.addCommand({
			id: 'stop-live-transcription',
			name: 'Arrêter la transcription en direct',
			checkCallback: (checking) => {
				const isTranscribing = this.serviceContainer.editorLiveTranscriptionService.isTranscribing();
				if (checking) return isTranscribing;

				this.serviceContainer.editorLiveTranscriptionService.stopTranscription();
				return true;
			}
		});

		// Command to identify speakers in transcript using AI
		this.addCommand({
			id: 'ai-identify-speakers-in-transcript',
			name: 'AI: Identify Speakers in Transcript',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (!this.serviceContainer.editorAISpeakerIdentificationService) {
					new Notice('AI Speaker Identification Service is not available.');
					return;
				}
				try {
					new Notice('AI Speaker Identification started...');
					await this.serviceContainer.editorAISpeakerIdentificationService.identifyAndWriteSpeakers(editor, view);
					// Notice of success is handled within the service itself
				} catch (error: any) {
					console.error('Error during AI speaker identification command:', error);
					new Notice(`Error identifying speakers: ${error.message}`);
				}
			}
		});

		// Add quick LLM configuration switch command
		this.addCommand({
			id: 'llm:select-model',
			name: 'llm:select-model',
			callback: () => {
				new QuickLLMConfigModal(this.app, this).open();
			}
		});

		// Information Research command
		this.addCommand({
			id: 'information-research:search',
			name: 'information-research:search',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.serviceContainer.editorInformationResearchService
							.processInformationResearch(markdownView);
					}
					return true;
				}
				return false;
			}
		});

		// Information Synthesis Summary command
		this.addCommand({
			id: 'information-research:summary',
			name: 'information-research:summary',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.serviceContainer.editorInformationSynthesisSummaryService
							.processInformationSynthesis(markdownView);
					}
					return true;
				}
				return false;
			}
		});
	}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		// Met à jour les références si c'est une nouvelle installation
		if (!this.settings.selectedLlmConfiguration) {
			updateDefaultReferences(this.settings);
			await this.saveSettings();
		}
	}

	async saveSettings() {
        await this.saveData(this.settings);
        // Recréer le service container avec les nouveaux paramètres
        this.serviceContainer = await ServiceContainer.create(this.app, this.settings, this);
        // Notifier tous les panels du changement de service
        this.notifyChatPanelsOfServiceChange();
    }

	/**
	 * Notifie tous les panels de chat actifs du changement de chatService
	 */
	public notifyChatPanelsOfServiceChange() {
		for (const panel of this.activeChatPanels) {
			panel.updateChatService(this.serviceContainer.chatService);
		}
	}

	async resetSettings() {
		this.settings = DEFAULT_SETTINGS;
		await this.saveSettings();
	}

	private async summarizeNote(markdownView: MarkdownView) {
		const editor = markdownView.editor;
		const content = editor.getValue();

		try {
			new Notice('Summarizing note...');
			const summary = await this.serviceContainer.noteSummarizationService.summarize(content);

			console.log('Summary result:', summary);
			new Notice('Note has been summarized! Check the console for details.');
		} catch (error) {
			console.error('Error during summarization:', error);
			new Notice('Error during summarization. Check the console for details.');
		}
	}

	setStatusBarText(text: string) {
		if (text) {
			this.statusBarItem.setText(text);
			this.statusBarItem.style.display = 'block';
		} else {
			this.statusBarItem.style.display = 'none';
		}
	}

	/**
	 * Crée les chunks à partir de la config et les insère dans le fichier actif.
	 */
	async printIndexableChunksInActiveFile() {
		const configs = this.settings.chunkingFolders;
		if (!configs || configs.length === 0) {
			new Notice('Aucune configuration de dossiers pour Create Chunks.');
			return;
		}
		new Notice('Analyse des dossiers en cours...');
		const chunks = await this.serviceContainer.editorChunkingService.getChunksFromConfigs(configs);

		// Utilisation du multiTechniqueChunkTransformer comme dans indexChunks
		const transformed = await this.serviceContainer.multiTechniqueChunkTransformer.transformAllTechniquesToIndexableChunks(chunks);

		// Fusionne tous les indexableChunks de toutes les techniques
		const allIndexableChunks = Object.values(transformed).flat();

		this.serviceContainer.editorChunkInsertionService.insertChunksInActiveFile([
			{ header: "# Chunks générés (toutes techniques)", chunks: allIndexableChunks }
		]);

		new Notice(`Chunks insérés (${allIndexableChunks.length}) pour toutes les techniques.`);
	}

	/**
	 * Indexe les chunks issus de la config, sans insertion ni feedback UI.
	 */
	private async indexChunks() {
		// S'assurer que tous les vector stores sont initialisés (sécurité anti-course)
		const configs = this.settings.chunkingFolders;
		if (!configs || configs.length === 0) {
			return;
		}
		const chunks = await this.serviceContainer.editorChunkingService.getChunksFromConfigs(configs);
		const transformed = await this.serviceContainer.multiTechniqueChunkTransformer.transformAllTechniquesToIndexableChunks(chunks);
		try {
			await this.serviceContainer.multiVectorStoreIndexer.indexTransformedChunks(transformed);
			new Notice("Indexation terminée avec succès !");
		} catch (error: any) {
			console.error("Erreur lors de l'indexation des chunks :", error);
			new Notice("Erreur lors de l'indexation (voir la console pour le détail).");
		}
	}

	async printAllVectorStoreDocumentsInActiveFile() {
		// Sécurité : s'assurer que tous les vector stores sont initialisés
		const vectorStores: import("./services/semantic/vector-store/VectorStore").VectorStore[] = this.serviceContainer.vectorStores;
		if (!vectorStores.length) {
			new Notice('Aucun vector store mémoire trouvé.');
			return;
		}
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		const editor = markdownView?.editor;
		if (!editor) {
			new Notice('Aucun fichier markdown actif pour insérer les documents.');
			return;
		}
		// Prépare tous les exports (header + documents) pour tous les vector stores et leurs collections
		const exports: { header: string; documents: any[] }[] = [];
		for (const vs of vectorStores) {
			const collections = vs.getAllCollections();
			for (const collection of collections) {
				const docs = vs.getAllDocuments(collection);
				const header = `# Documents du vector store ${vs.id} (collection: ${collection})`;
				exports.push({ header, documents: docs });
			}
		}
		console.log('[KnowledgeManagerPlugin.printAllVectorStoreDocumentsInActiveFile] exports:', exports);
		for (const exp of exports) {
			console.log(`[KnowledgeManagerPlugin] Collection: ${exp.header}, nb docs: ${exp.documents.length}`);
		}
		this.serviceContainer.editorChunkInsertionService.insertAllVectorStoreJsonObjects(exports);

		new Notice(`Insertion de tous les documents (${exports.reduce((acc, e) => acc + e.documents.length, 0)}) dans la note active.`);
	}

	/**
	 * Lance une recherche sémantique sur tous les vector stores et techniques,
	 * puis insère les résultats dans la note active, structurés par vector store et technique.
	 */
	async searchInAllVectorStoresAndPrintResults() {
		new PromptModal(this.app, async (query: string, topK: number) => {
			console.log('searchInAllVectorStoresAndPrintResults', this.serviceContainer.serviceContainerId);
			// Appel simplifié : le service multi-recherche gère tout lui-même
			const multiSemanticSearchService = this.serviceContainer.multiSemanticSearchService;
			if (!multiSemanticSearchService) {
				new Notice('Service multi-recherche indisponible.');
				return;
			}
			let resultsByCombination;
			try {
				resultsByCombination = await multiSemanticSearchService.searchEverywhere(query, topK);
			} catch (e) {
				console.error('Erreur lors de la recherche sémantique multi-vector store:', e);
				new Notice('Erreur lors de la recherche sémantique. Voir la console.');
				return;
			}
			// Préparation des exports pour l'insertion
			const exports = Object.entries(resultsByCombination).map(([vectorStoreKey, results]: [string, any[]]) => {
				const header = `# Documents du vector store ${vectorStoreKey}`;
				const documents = results.map(r => ({ ...r }));
				return { header, documents };
			});
			this.serviceContainer.editorChunkInsertionService.insertAllVectorStoreJsonObjects(exports);
			new Notice('Résultats de la recherche insérés dans la note active.');
		}).open();
	}

	private async resetVectorStores() {
		const container = (this as any).serviceContainer as any;
		if (container?.vectorStores) {
			await Promise.all(container.vectorStores.map((store: any) => store.reset?.()));
			new Notice('Tous les Vector Stores ont été réinitialisés.');
		} else {
			new Notice('Impossible de trouver les Vector Stores.');
		}
	}

	/**
	 * Démarre le serveur API
	 */
	private async startApiServer() {
		if (this.httpServerService.isServerRunning()) {
			new Notice('Semantic Search API is already running');
			return;
		}

		try {
			await this.httpServerService.start();
			this.apiStatusBar.setServerRunning(true);
			const serverUrl = this.httpServerService.getServerUrl();
			new Notice(`Semantic Search API started successfully at ${serverUrl}`);
			console.log(`[API] Semantic Search API started at ${serverUrl}`);
			console.log(`[API] Available endpoints:`);
			console.log(`[API] - POST ${serverUrl}/semantic-search`);
			console.log(`[API] - GET ${serverUrl}/health`);

		} catch (error) {
			console.error('[API] Failed to start server:', error);
			new Notice('Failed to start Semantic Search API: ' + (error instanceof Error ? error.message : 'Unknown error'));
		}
	}

	/**
	 * Arrête le serveur API
	 */
	private async stopApiServer() {
		if (!this.httpServerService.isServerRunning()) {
			new Notice('Semantic Search API is not running');
			return;
		}

		try {
			await this.httpServerService.stop();
			this.apiStatusBar.setServerRunning(false);
			new Notice('Semantic Search API stopped');
			console.log('[API] Semantic Search API stopped');

		} catch (error) {
			console.error('[API] Failed to stop server:', error);
			new Notice('Failed to stop Semantic Search API: ' + (error instanceof Error ? error.message : 'Unknown error'));
		}
	}

	/**
	 * Toggle du serveur API (utilisé par le status bar)
	 */
	private toggleApiServer() {
		if (this.httpServerService.isServerRunning()) {
			this.stopApiServer();
		} else {
			this.startApiServer();
		}
	}

	/**
	 * Nettoyage à la fermeture du plugin
	 */
	async onunload() {
		// Arrêter le serveur API si il est en cours
		if (this.httpServerService && this.httpServerService.isServerRunning()) {
			await this.stopApiServer();
		}
		
		// Nettoyer le status bar
		if (this.apiStatusBar) {
			this.apiStatusBar.destroy();
		}
	}
}
