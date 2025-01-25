import { App, Editor, MarkdownView, Modal, Notice, Plugin, TFolder, TFile, MarkdownRenderer } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS, RootNode } from './settings/settings';
import { HeaderNode } from './models/header-node';
import { SettingsTab } from './settings/settings-tab';
import { FolderSuggestModal } from './ui/folder-suggest.modal';
import { ServiceContainer } from './services/service-container';
import { LoadingModal } from './ui/loading.modal';
import { MindmapInputModal } from './ui/mindmap-input.modal';
import { ReplacementSpecsAnalysisModal } from './ui/replacement-specs-analysis.modal';
import { ReplacementSpecsError } from './models/errors';
import { GlossarySpecsSelectionModal } from './ui/glossary-specs-selection.modal';
import { ReplacementSpecs } from './models/schemas';

const HELP_CONTENT = `# Aide - Commandes de Remplacement de Transcript

## Vue d'ensemble
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
    settings: PluginSettings;
    private serviceContainer: ServiceContainer;

    async onload() {
        await this.loadSettings();
        this.serviceContainer = new ServiceContainer(this.app, this.settings);

        // Register commands
        this.addCommand({
            id: 'note-dissusion:diffuse-current-note',
            name: 'note-dissusion:diffuse-current-note',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    if (!checking) {
                        this.diffuseCurrentNote(markdownView);
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
                        this.removeReferenceContent(markdownView);
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
                        this.createReplacementSpecsFromSpeakers(markdownView);
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
                if (markdownView) {
                    if (!checking) {
                        this.createReplacementSpecsFromAI(markdownView);
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
                        this.applyReplacementSpecs(markdownView);
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
                    this.applyVocabularyReplacements(view);
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
                        this.publishReplacementSpecsToVault(markdownView);
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
                        this.createDocumentation(markdownView);
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
                        this.listConversationTopics(markdownView);
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
                            const content = activeView.editor.getValue();
                            const headerTree = this.serviceContainer.documentStructureService.buildHeaderTree(cache, content);
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

        // Add settings tab
        this.addSettingTab(new SettingsTab(this.app, this));

        // Add the show transcript replacement help command
        this.addCommand({
            id: 'transcript-replacement:aide',
            name: 'transcript-replacement:aide',
            callback: () => {
                this.showTranscriptReplacementHelp();
            }
        });
    }

    async loadSettings() {
        const data = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Recréer le service container avec les nouveaux settings
        this.serviceContainer = new ServiceContainer(this.app, this.settings);
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

    private async diffuseCurrentNote(markdownView: MarkdownView) {
        const editor = markdownView.editor;
        const content = editor.getValue();
        const file = markdownView.file;
        if (!file) {
            new Notice('No file is currently open');
            return;
        }
        
        try {
            new Notice('Diffusing note...');

            // Get the file cache and build header tree
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache) {
                throw new Error('No cache available for this file');
            }

            const headerTree = this.serviceContainer.documentStructureService.buildHeaderTree(cache, content);
            const diffusionPlans = this.serviceContainer.knowledgeDiffusionService.buildDiffusionRepresentation(headerTree);

            if (diffusionPlans.length === 0) {
                new Notice('No diffusion references found in the note');
                return;
            }

            // Execute the diffusion plans
            await this.serviceContainer.knowledgeDiffusionService.diffuseKnowledge(
                diffusionPlans,
                this.app.vault
            );

            console.log('Diffusion completed:', diffusionPlans);
            new Notice('Note has been diffused! Check the console for details.');
        } catch (error) {
            console.error('Error during diffusion:', error);
            new Notice(`Error during diffusion: ${error.message}`); 
        }
    }

    private async removeReferenceContent(view: MarkdownView) {
        try {
            new Notice('Cleaning references content...');
            
            const editor = view.editor;
            const content = editor.getValue();
            const file = view.file;
            
            if (!file) {
                new Notice('No file is currently open');
                return;
            }

            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache) {
                new Notice('No cache found for the current file');
                return;
            }

            // Build the document tree using document structure service
            const rootNode = this.serviceContainer.documentStructureService.buildHeaderTree(cache, content);
            
            // Clean the content using document cleaning service
            const cleanedRootNode = this.serviceContainer.documentCleaningService.cleanNode(rootNode) as RootNode;
            
            // Convert back to markdown
            const cleanedContent = this.serviceContainer.documentStructureService.renderToMarkdown(cleanedRootNode);
            
            // Update the editor with the cleaned content
            editor.setValue(cleanedContent);
            
            new Notice('References content has been removed');
        } catch (error) {
            console.error('Error while removing references:', error);
            new Notice(`Error while removing references: ${error.message}`);
        }
    }

    private getTranscriptContent(doc: RootNode): string | null {
        const transcriptHeader = this.serviceContainer.documentStructureService.findFirstNodeMatchingHeading(
            doc,
            this.settings.headerContainingTranscript
        );

        if (!transcriptHeader) {
            new Notice(`Header '${this.settings.headerContainingTranscript}' not found`);
            return null;
        }

        return transcriptHeader.content;
    }

    private checkReplacementHeaderInDocument(doc: RootNode): boolean {
        const existingReplacements = this.serviceContainer.documentStructureService.findFirstNodeMatchingHeading(
            doc,
            this.settings.replacementsHeader
        );
        if (existingReplacements) {
            new Notice('Replacements section already exists');
            return false;
        }
        return true;
    }

    private modifyDocumentWithReplacementHeader(doc: RootNode, yamlContent: string): void {
        const codeBlock = this.serviceContainer.yamlReplacementService.toYamlBlock(yamlContent);
        const newHeader = Object.assign(new HeaderNode(), {
            level: 1,
            heading: this.settings.replacementsHeader,
            content: codeBlock,
        });
        doc.children.unshift(newHeader);
    }

    private addGlossarySection(doc: RootNode, terms: { terme: string, definition: string }[]) {
        const header = new HeaderNode();
        header.level = 1;
        header.heading = "Glossaire";
        header.content = terms
            .filter(({definition}) => definition.trim() !== '-')  
            .map(({terme, definition}) => `- **${terme}** : ${definition.trim()}`)
            .join('\n');
        
        doc.children.unshift(header);
        return true;
    }

    private async createReplacementSpecsFromSpeakers(markdownView: MarkdownView) {
        const file = markdownView.file;
        if (!file) return;

        const content = await this.app.vault.read(file);
        const metadata = this.app.metadataCache.getFileCache(file);
        const doc = this.serviceContainer.documentStructureService.buildHeaderTree(metadata!, content);

        if (!this.checkReplacementHeaderInDocument(doc)) return;

        // Obtenir le contenu de la transcription
        const transcriptContent = this.getTranscriptContent(doc);
        if (!transcriptContent) return;

        // Créer les specs à partir des speakers
        const interventions = this.serviceContainer.transcriptFileService.parseTranscript(transcriptContent);
        const speakers = this.serviceContainer.transcriptFileService.getUniqueSpeakers(interventions);
        const specs = this.serviceContainer.transcriptionReplacementService.createFromSpeakers(speakers);
        
        // Convertir en YAML et ajouter au document
        const yamlContent = this.serviceContainer.yamlReplacementService.toYaml(specs);
        this.modifyDocumentWithReplacementHeader(doc, yamlContent);

        // Sauvegarder les modifications
        const newContent = this.serviceContainer.documentStructureService.renderToMarkdown(doc);
        await this.app.vault.modify(file, newContent);
        
        new Notice('Added replacements section');
    }

    private async createReplacementSpecsFromAI(markdownView: MarkdownView) {
        const file = markdownView.file;
        if (!file) {
            console.log("No file found in markdownView");
            return;
        }

        const content = await this.app.vault.read(file);
        const metadata = this.app.metadataCache.getFileCache(file);
        const doc = this.serviceContainer.documentStructureService.buildHeaderTree(metadata!, content);

        if (!this.checkReplacementHeaderInDocument(doc)) return;

        // Obtenir le contenu de la transcription
        const transcriptContent = this.getTranscriptContent(doc);
        if (!transcriptContent) {
            console.log(`No transcript content found in header '${this.settings.headerContainingTranscript}'`);
            return;
        }

        // Créer les specs à partir du glossaire
        let isCancelled = false;
        const loadingModal = new LoadingModal(this.app, () => {
            isCancelled = true;
        });
        loadingModal.open();

        try {
            const glossaryTerms = await this.serviceContainer.glossarySearchService.findGlossaryTerms(
                transcriptContent,
                this.settings.maxGlossaryIterations
            );
            
            if (isCancelled) {
                new Notice('Operation cancelled');
                return;
            }

            const initialSpecs = this.serviceContainer.glossaryReplacementService.createFromGlossaryTerms(glossaryTerms.termes);

            // Afficher la modale de sélection
            const specs = await new Promise<ReplacementSpecs | null>(resolve => {
                new GlossarySpecsSelectionModal(
                    this.app,
                    initialSpecs,
                    selectedSpecs => {
                        resolve(selectedSpecs);
                    }
                ).open();
            });

            // Si annulé ou aucune spec sélectionnée
            if (!specs || specs.replacements.length === 0) {
                new Notice('Opération annulée');
                return;
            }
            
            // Convertir en YAML et ajouter au document
            const yamlContent = this.serviceContainer.yamlReplacementService.toYaml(specs);
            this.modifyDocumentWithReplacementHeader(doc, yamlContent);

            // Ajouter la section glossaire
            if (!this.addGlossarySection(doc, glossaryTerms.termes)) {
                console.log("Failed to add glossary section - could not find replacements header");
                return;
            }

            // Sauvegarder les modifications
            const newContent = this.serviceContainer.documentStructureService.renderToMarkdown(doc);
            await this.app.vault.modify(file, newContent);
            
            new Notice('Successfully added glossary replacements section');
        } finally {
            loadingModal.forceClose();
        }
    }

    private async applyReplacementSpecs(markdownView: MarkdownView) {
        await this.serviceContainer.editorTranscriptionReplacementService.replaceTranscription(
            markdownView,
            this.settings.replacementSpecsTag,
            this.settings.headerContainingTranscript,
            this.settings.replacementsHeader,
        );
    }

    private async applyVocabularyReplacements(view: MarkdownView) {
        await this.serviceContainer.editorVocabularyReplacementService.replaceWithVocabulary(
            view,
            this.settings.vocabularySpecsTag,
            this.settings.headerContainingTranscript,
            this.settings.replacementsHeader
        );
    }

    private async publishReplacementSpecsToVault(markdownView: MarkdownView) {
        try {
            const analysis = await this.serviceContainer.editorReplacementSpecsIntegrationService
                .analyzeCurrentFileSpecs(
                    markdownView,
                    this.settings.replacementSpecsTag,
                    this.settings.replacementsHeader
                );
            
            if (!analysis) {
                new Notice('No replacement specs found in current file');
                return;
            }
    
            new ReplacementSpecsAnalysisModal(this.app, analysis).open();
        } catch (error) {
            if (error instanceof ReplacementSpecsError) {
                new Notice('Erreur lors de l\'analyse des specs. Voir la console pour plus de détails.');
            } else {
                new Notice('Une erreur inattendue est survenue. Voir la console pour plus de détails.');
            }
            // L'erreur est déjà loguée dans le service
        }
    }

    private async createDocumentation(markdownView: MarkdownView) {
        try {
            const file = markdownView.file;
            if (!file) {
                new Notice('No file is currently open');
                return;
            }

            const content = await this.app.vault.read(file);
            const metadata = this.app.metadataCache.getFileCache(file);
            const doc = this.serviceContainer.documentStructureService.buildHeaderTree(metadata!, content);

            // Get transcript content
            const transcriptContent = this.getTranscriptContent(doc);
            if (!transcriptContent) {
                return;
            }

            // Show loading modal
            let isCancelled = false;
            const loadingModal = new LoadingModal(this.app, () => {
                isCancelled = true;
            });
            loadingModal.open();

            try {
                // Get mindmap from user
                await new Promise<void>((resolve) => {
                    new MindmapInputModal(this.app, async (mindmap: string) => {
                        try {
                            if (isCancelled) {
                                resolve();
                                return;
                            }

                            // Generate documentation
                            const documentation = await this.serviceContainer.documentationService.createDocumentation(
                                transcriptContent,
                                mindmap
                            );

                            // Add documentation as a new section
                            const header = new HeaderNode();
                            header.level = 1;
                            header.heading = "Résumé";
                            header.content = documentation;
                            doc.children.unshift(header);

                            // Save changes
                            const newContent = this.serviceContainer.documentStructureService.renderToMarkdown(doc);
                            await this.app.vault.modify(file, newContent);

                            new Notice('Documentation has been created successfully!');
                        } catch (error) {
                            console.error('Error creating documentation:', error);
                            new Notice('Error creating documentation. Check the console for details.');
                        } finally {
                            loadingModal.forceClose();
                            resolve();
                        }
                    }).open();
                });
            } catch (error) {
                loadingModal.forceClose();
                throw error;
            }
        } catch (error) {
            console.error('Error in createDocumentation:', error);
            new Notice('Error in createDocumentation. Check the console for details.');
        }
    }

    private async listConversationTopics(markdownView: MarkdownView) {
        try {
            const file = markdownView.file;
            if (!file) {
                new Notice('No file is currently open');
                return;
            }

            const content = await this.app.vault.read(file);
            const metadata = this.app.metadataCache.getFileCache(file);
            const doc = this.serviceContainer.documentStructureService.buildHeaderTree(metadata!, content);

            // Get transcript content
            const transcriptContent = this.getTranscriptContent(doc);
            if (!transcriptContent) {
                return;
            }

            // Show loading modal
            let isCancelled = false;
            const loadingModal = new LoadingModal(this.app, () => {
                isCancelled = true;
            });
            loadingModal.open();

            try {
                // Generate topics list
                const topics = await this.serviceContainer.conversationTopicsService.listTopics(transcriptContent);

                if (isCancelled) {
                    new Notice('Operation cancelled');
                    return;
                }

                // Add topics as a new section
                const header = new HeaderNode();
                header.level = 1;
                header.heading = "Sujets";
                header.content = topics;
                doc.children.unshift(header);

                // Save changes
                const newContent = this.serviceContainer.documentStructureService.renderToMarkdown(doc);
                await this.app.vault.modify(file, newContent);

                new Notice('Topics list has been created successfully!');
            } catch (error) {
                console.error('Error listing topics:', error);
                new Notice('Error listing topics. Check the console for details.');
            } finally {
                loadingModal.forceClose();
            }
        } catch (error) {
            console.error('Error in listConversationTopics:', error);
            new Notice('Error in listConversationTopics. Check the console for details.');
        }
    }

    private async showTranscriptReplacementHelp() {
        try {
            new HelpModal(this.app, this).open();
        } catch (error) {
            console.error('Error showing help:', error);
            new Notice('Erreur lors de l\'affichage de l\'aide');
        }
    }
}
