import { App, MarkdownView, Notice, TFile } from 'obsidian';
import { DocumentStructureService } from '../document/document-structure.service';
import { InformationSynthesisSummaryService, FileResult } from './information-synthesis-summary.service';
import { EditorInformationResearchService } from './editor-information-research.service';
import { LoadingModal } from '../../ui/loading.modal';
import { PluginSettings } from '../../settings/settings';
import { INFORMATION_SYNTHESIS_SECTIONS, INFORMATION_SYNTHESIS_MESSAGES } from './information-synthesis.constants';
import { HeaderNode } from '../../models/header-node';

export class EditorInformationSynthesisSummaryService {
    constructor(
        private app: App,
        private settings: PluginSettings,
        private documentStructureService: DocumentStructureService,
        private informationSynthesisSummaryService: InformationSynthesisSummaryService,
        private editorInformationResearchService: EditorInformationResearchService
    ) {}

    async processInformationSynthesis(markdownView: MarkdownView): Promise<void> {
        try {
            // 1. Vérifier si section Résultat existe
            const hasResultSection = await this.checkResultSectionExists(markdownView);
            if (!hasResultSection) {
                new Notice(INFORMATION_SYNTHESIS_MESSAGES.NO_RESULT_SECTION);
                return;
            }

            // 2. Vérifier si section Synthèse existe déjà
            const hasSynthesisSection = await this.checkSynthesisSectionExists(markdownView);
            if (hasSynthesisSection) {
                new Notice(INFORMATION_SYNTHESIS_MESSAGES.SYNTHESIS_SECTION_EXISTS);
                return;
            }

            // 3. Parser la note active pour extraire contexte et résultats
            const data = await this.parseActiveNoteForSynthesis(markdownView);
            if (!data) return;

            // 4. Traitement avec modal de progression
            await this.processSynthesisWithProgress(markdownView, data);

        } catch (error) {
            console.error('EditorInformationSynthesisSummaryService:', INFORMATION_SYNTHESIS_MESSAGES.PROCESSING_ERROR, error);
            new Notice(`${INFORMATION_SYNTHESIS_MESSAGES.PROCESSING_ERROR} ${error.message}`);
        }
    }

    private async checkResultSectionExists(markdownView: MarkdownView): Promise<boolean> {
        if (!markdownView.file) return false;
        
        const doc = await this.documentStructureService.buildHeaderTree(this.app, markdownView.file);
        const resultNode = this.documentStructureService.findFirstNodeMatchingHeading(doc.root, INFORMATION_SYNTHESIS_SECTIONS.RESULT);
        
        return resultNode !== null;
    }

    private async checkSynthesisSectionExists(markdownView: MarkdownView): Promise<boolean> {
        if (!markdownView.file) return false;
        
        const doc = await this.documentStructureService.buildHeaderTree(this.app, markdownView.file);
        const synthesisNode = this.documentStructureService.findFirstNodeMatchingHeading(doc.root, INFORMATION_SYNTHESIS_SECTIONS.TOPIC_SYNTHESIS);
        
        return synthesisNode !== null;
    }

    private async parseActiveNoteForSynthesis(markdownView: MarkdownView): Promise<{question: string, filePaths: string[], fileResults: FileResult[]} | null> {
        // 1. Réutiliser la logique existante pour parser Question + Fichiers
        const dto = await this.editorInformationResearchService.parseActiveNote(markdownView);
        if (!dto) {
            return null; // Les messages d'erreur sont déjà gérés par la méthode
        }

        // 2. Lire la section Résultat existante
        if (!markdownView.file) {
            new Notice(INFORMATION_SYNTHESIS_MESSAGES.NO_ACTIVE_FILE);
            return null;
        }
        
        const doc = await this.documentStructureService.buildHeaderTree(this.app, markdownView.file);
        const resultNode = this.documentStructureService.findFirstNodeMatchingHeading(doc.root, INFORMATION_SYNTHESIS_SECTIONS.RESULT);
        
        if (!resultNode || resultNode.children.length === 0) {
            new Notice(INFORMATION_SYNTHESIS_MESSAGES.EMPTY_RESULTS);
            return null;
        }

        // 3. Convertir les sous-sections en FileResult et résoudre les vrais noms de fichiers
        const fileResults: FileResult[] = resultNode.children.map(child => ({
            fileName: child.heading,
            content: child.content
        }));

        // 4. Résoudre les vrais noms de fichiers Obsidian pour créer des liens valides
        const resolvedFilePaths: string[] = [];
        for (const filePath of dto.filePaths) {
            const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(filePath, '');
            if (resolvedFile) {
                // Utiliser le nom du fichier sans l'extension pour les liens Obsidian
                const fileNameWithoutExtension = resolvedFile.basename;
                resolvedFilePaths.push(fileNameWithoutExtension);
            } else {
                // Fallback au nom original si la résolution échoue
                resolvedFilePaths.push(filePath);
            }
        }

        return { 
            question: dto.question, 
            filePaths: resolvedFilePaths, 
            fileResults 
        };
    }

    private async processSynthesisWithProgress(
        markdownView: MarkdownView, 
        data: {question: string, filePaths: string[], fileResults: FileResult[]}
    ): Promise<void> {
        let isCancelled = false;
        const loadingModal = new LoadingModal(this.app, () => {
            isCancelled = true;
        }, INFORMATION_SYNTHESIS_MESSAGES.SYNTHESIS_GENERATION);
        loadingModal.open();

        try {
            loadingModal.updateTitle(INFORMATION_SYNTHESIS_MESSAGES.SYNTHESIS_TITLE);
            loadingModal.updateProgress(INFORMATION_SYNTHESIS_MESSAGES.ANALYSIS_AND_SYNTHESIS);
            
            if (isCancelled) {
                new Notice(INFORMATION_SYNTHESIS_MESSAGES.OPERATION_CANCELLED);
                return;
            }

            // Génération de la synthèse
            const synthesis = await this.informationSynthesisSummaryService.synthesizeByTopic(
                data.question, 
                data.filePaths, 
                data.fileResults
            );

            if (isCancelled) {
                new Notice(INFORMATION_SYNTHESIS_MESSAGES.OPERATION_CANCELLED);
                return;
            }

            // Insertion de la synthèse dans le document
            loadingModal.updateProgress(INFORMATION_SYNTHESIS_MESSAGES.DOCUMENT_INSERTION);
            await this.insertSynthesisInActiveFile(markdownView, synthesis);
            
            loadingModal.updateProgress(INFORMATION_SYNTHESIS_MESSAGES.SYNTHESIS_FINISHED);
            
        } finally {
            // Petit délai pour voir le message final
            setTimeout(() => loadingModal.forceClose(), 500);
        }
    }

    private async insertSynthesisInActiveFile(markdownView: MarkdownView, synthesis: string): Promise<void> {
        if (!markdownView.file) return;
        
        try {
            // Vérifier que le cache est valide
            const metadataCheck = this.app.metadataCache.getFileCache(markdownView.file);
            if (!metadataCheck) {
                await new Promise(resolve => setTimeout(resolve, 100));
                const metadataRetry = this.app.metadataCache.getFileCache(markdownView.file);
                if (!metadataRetry) {
                    throw new Error('Cache metadata invalide pour le fichier actif');
                }
            }
            
            const doc = await this.documentStructureService.buildHeaderTree(this.app, markdownView.file);
        
            // Créer la section Synthèse par Sujets et parser le contenu de l'IA
            const synthesisHeader = new HeaderNode();
            synthesisHeader.level = 1;
            synthesisHeader.heading = INFORMATION_SYNTHESIS_SECTIONS.TOPIC_SYNTHESIS;
            synthesisHeader.content = '';
            synthesisHeader.children = this.parseAIContentToHeaderNodes(synthesis);
            
            doc.root.children.push(synthesisHeader);

            // Sauvegarder
            const newContent = this.documentStructureService.renderToMarkdown(doc.root);
            await this.app.vault.modify(markdownView.file, newContent);
            
            new Notice(INFORMATION_SYNTHESIS_MESSAGES.SYNTHESIS_SUCCESS);
            
        } catch (error) {
            throw error;
        }
    }

    private parseAIContentToHeaderNodes(content: string): HeaderNode[] {
        const lines = content.split('\n');
        const nodes: HeaderNode[] = [];
        let currentNode: HeaderNode | null = null;
        let currentContent: string[] = [];

        for (const line of lines) {
            const headerMatch = line.match(/^(#{2,6})\s+(.+)$/); // Match ## to ######
            
            if (headerMatch) {
                // Sauvegarder le noeud précédent s'il existe
                if (currentNode) {
                    currentNode.content = currentContent.join('\n').trim();
                    nodes.push(currentNode);
                }
                
                // Créer un nouveau noeud
                currentNode = new HeaderNode();
                currentNode.level = headerMatch[1].length; // Nombre de #
                currentNode.heading = headerMatch[2].trim();
                currentNode.content = '';
                currentNode.children = [];
                currentContent = [];
            } else {
                // Ajouter la ligne au contenu du noeud actuel
                currentContent.push(line);
            }
        }

        // Sauvegarder le dernier noeud
        if (currentNode) {
            currentNode.content = currentContent.join('\n').trim();
            nodes.push(currentNode);
        }

        return nodes;
    }
}