import { App, Editor, MarkdownView, Notice, Plugin, TFolder, TFile } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS, RootNode } from './types/settings';
import { HeaderNode } from './models/header-node';
import { SettingsTab } from './settings/settings-tab';
import { FolderSuggestModal } from './ui/folder-suggest.modal';
import { ServiceContainer } from './services/service-container';
import { LoadingModal } from './ui/loading.modal';

export default class KnowledgeManagerPlugin extends Plugin {
    settings: PluginSettings;
    private serviceContainer: ServiceContainer;
    private static readonly REPLACEMENTS_HEADER = 'Replacements';

    async onload() {
        await this.loadSettings();
        this.serviceContainer = new ServiceContainer(this.app, this.settings);

        // Register commands
        this.addCommand({
            id: 'diffuse-note',
            name: 'Diffuse current note',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    if (!checking) {
                        this.diffuseNote(markdownView);
                    }
                    return true;
                }
                return false;
            }
        });

        // Add the summarize command
        this.addCommand({
            id: 'summarize-note',
            name: 'Summarize current note',
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
            id: 'map-vault',
            name: 'Map Vault',
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
            id: 'print-file-cache',
            name: 'Print File Cache',
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

        // Add the remove references content command
        this.addCommand({
            id: 'remove-refs-content',
            name: 'Remove References Content',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    if (!checking) {
                        this.removeRefsContent(markdownView);
                    }
                    return true;
                }
                return false;
            }
        });

        // Add command to print translation prompt template
        this.addCommand({
            id: 'print-translation-template',
            name: 'Print Translation Prompt Template',
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

        // Add the add replacements section command
        this.addCommand({
            id: 'add-replacements-section',
            name: 'Add section: replacements',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    if (!checking) {
                        this.addReplacementsSection(markdownView);
                    }
                    return true;
                }
                return false;
            }
        });

        // Add the replace transcription command
        this.addCommand({
            id: 'replace-transcription',
            name: 'Replace transcription',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    if (!checking) {
                        this.replaceTranscription(markdownView);
                    }
                    return true;
                }
                return false;
            }
        });

        // Add vocabulary replacement command
        this.addCommand({
            id: 'replace-text-using-vocabulary',
            name: 'Replace text using vocabulary',
            editorCallback: (editor: Editor) => {
                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (view) {
                    this.replaceWithVocabulary(view);
                }
            }
        });

        // Add the find glossary words command
        this.addCommand({
            id: 'find-glossary-words',
            name: 'Find New Glossary Words with AI',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    if (!checking) {
                        this.findGlossaryWords(markdownView);
                    }
                    return true;
                }
                return false;
            }
        });

        // Add the add glossary replacements section command
        this.addCommand({
            id: 'add-glossary-replacements-section',
            name: 'Add section: glossary replacements',
            checkCallback: (checking: boolean) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    if (!checking) {
                        this.addGlossaryReplacementsSection(markdownView);
                    }
                    return true;
                }
                return false;
            }
        });

        // Add settings tab
        this.addSettingTab(new SettingsTab(this.app, this));
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

    private async diffuseNote(markdownView: MarkdownView) {
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

    private async removeRefsContent(view: MarkdownView) {
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
            KnowledgeManagerPlugin.REPLACEMENTS_HEADER
        );
        if (existingReplacements) {
            new Notice('Replacements section already exists');
            return false;
        }
        return true;
    }

    private modifyDocumentWithReplacementHeader(doc: RootNode, yamlContent: string): void {
        const codeBlock = this.serviceContainer.yamlReplacementService.toBlock(yamlContent);
        const newHeader = Object.assign(new HeaderNode(), {
            level: 1,
            heading: KnowledgeManagerPlugin.REPLACEMENTS_HEADER,
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

    private async addReplacementsSection(markdownView: MarkdownView) {
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
        const yamlContent = this.serviceContainer.yamlReplacementService.stringify(specs);
        this.modifyDocumentWithReplacementHeader(doc, yamlContent);

        // Sauvegarder les modifications
        const newContent = this.serviceContainer.documentStructureService.renderToMarkdown(doc);
        await this.app.vault.modify(file, newContent);
        
        new Notice('Added replacements section');
    }

    private async addGlossaryReplacementsSection(markdownView: MarkdownView) {
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
        const loadingModal = new LoadingModal(this.app);
        loadingModal.open();

        try {
            const glossaryTerms = await this.serviceContainer.glossarySearchService.findGlossaryTerms(
                transcriptContent,
                this.settings.maxGlossaryIterations
            );
            const specs = this.serviceContainer.glossaryReplacementService.createFromGlossaryTerms(glossaryTerms.termes);
            
            // Convertir en YAML et ajouter au document
            const yamlContent = this.serviceContainer.yamlReplacementService.stringify(specs);
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

    private async replaceTranscription(markdownView: MarkdownView) {
        await this.serviceContainer.editorTranscriptionReplacementService.replaceTranscription(
            markdownView,
            this.settings.replacementSpecsTag,
            this.settings.headerContainingTranscript,
            KnowledgeManagerPlugin.REPLACEMENTS_HEADER,
        );
    }

    private async replaceWithVocabulary(markdownView: MarkdownView) {
        await this.serviceContainer.editorVocabularyReplacementService.replaceWithVocabulary(
            markdownView,
            this.settings.vocabularySpecsTag,
            this.settings.headerContainingTranscript,
            KnowledgeManagerPlugin.REPLACEMENTS_HEADER
        );
    }

    private async findGlossaryWords(markdownView: MarkdownView) {
        const file = markdownView.file;
        if (!file) return;

        const content = await this.app.vault.read(file);
        const metadata = this.app.metadataCache.getFileCache(file);
        const doc = this.serviceContainer.documentStructureService.buildHeaderTree(metadata!, content);

        // Obtenir le contenu de la transcription
        const transcriptContent = this.getTranscriptContent(doc);
        if (!transcriptContent) return;

        try {
            const glossary = await this.serviceContainer.glossarySearchService.findGlossaryTerms(
                transcriptContent,
                this.settings.maxGlossaryIterations
            );

            console.log('Glossary:', glossary);
        } catch (error) {
            console.error("Error in findGlossaryTerms:", error);
            new Notice('Error finding glossary terms. Check the console for details.');
        }
    }
}
