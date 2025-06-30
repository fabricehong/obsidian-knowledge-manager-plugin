import { App, MarkdownView, Notice, TFile } from 'obsidian';
import { DocumentStructureService } from '../document/document-structure.service';
import { InformationResearchService } from './information-research.service';
import { InformationResearchDTO } from '../../models/interfaces';
import { LoadingModal } from '../../ui/loading.modal';
import { PluginSettings } from '../../settings/settings';
import { INFORMATION_SYNTHESIS_SECTIONS, INFORMATION_SYNTHESIS_MESSAGES, INFORMATION_SYNTHESIS_PATTERNS } from './information-synthesis.constants';

export class EditorInformationResearchService {
    constructor(
        private app: App,
        private settings: PluginSettings,
        private documentStructureService: DocumentStructureService,
        private informationResearchService: InformationResearchService
    ) {}

    async processInformationResearch(markdownView: MarkdownView): Promise<void> {
        try {
            // 1. Parser la note active
            const dto = await this.parseActiveNote(markdownView);
            if (!dto) return;

            // 2. Vérifier si section Résultat existe déjà
            const hasExistingResults = await this.checkExistingResultSection(markdownView);
            if (hasExistingResults) {
                new Notice(INFORMATION_SYNTHESIS_MESSAGES.RESULT_SECTION_EXISTS);
                return;
            }

            // 3. Initialiser la section Résultat
            await this.initializeResultSection(markdownView);

            // 4. Traitement itératif avec modal de progression
            await this.processFilesWithProgress(markdownView, dto);

        } catch (error) {
            console.error('EditorInformationResearchService:', INFORMATION_SYNTHESIS_MESSAGES.PROCESSING_ERROR, error);
            new Notice(`${INFORMATION_SYNTHESIS_MESSAGES.PROCESSING_ERROR} ${error.message}`);
        }
    }

    public async parseActiveNote(markdownView: MarkdownView): Promise<InformationResearchDTO | null> {
        if (!markdownView.file) {
            new Notice(INFORMATION_SYNTHESIS_MESSAGES.NO_ACTIVE_FILE);
            return null;
        }
        
        const doc = await this.documentStructureService.buildHeaderTree(this.app, markdownView.file);
        
        // Rechercher sections Question et Fichiers
        const questionNode = this.documentStructureService.findFirstNodeMatchingHeading(doc.root, INFORMATION_SYNTHESIS_SECTIONS.QUESTION);
        const filesNode = this.documentStructureService.findFirstNodeMatchingHeading(doc.root, INFORMATION_SYNTHESIS_SECTIONS.FILES);

        if (!questionNode || !filesNode) {
            new Notice(INFORMATION_SYNTHESIS_MESSAGES.INVALID_FORMAT);
            return null;
        }

        const question = questionNode.content.trim();
        if (!question) {
            new Notice(INFORMATION_SYNTHESIS_MESSAGES.EMPTY_QUESTION);
            return null;
        }

        // Extraire les liens [[filename]] du contenu de la section Fichiers
        const filePaths = this.extractObsidianLinks(filesNode.content);
        if (filePaths.length === 0) {
            new Notice(INFORMATION_SYNTHESIS_MESSAGES.NO_OBSIDIAN_LINKS);
            return null;
        }

        return { question, filePaths };
    }

    public extractObsidianLinks(content: string): string[] {
        const links: string[] = [];
        let match;
        
        while ((match = INFORMATION_SYNTHESIS_PATTERNS.OBSIDIAN_LINK.exec(content)) !== null) {
            links.push(match[1]);
        }
        
        return links;
    }

    private async checkExistingResultSection(markdownView: MarkdownView): Promise<boolean> {
        if (!markdownView.file) return false;
        
        const doc = await this.documentStructureService.buildHeaderTree(this.app, markdownView.file);
        const existingResultNode = this.documentStructureService.findFirstNodeMatchingHeading(doc.root, INFORMATION_SYNTHESIS_SECTIONS.RESULT);
        
        return existingResultNode !== null;
    }

    private async initializeResultSection(markdownView: MarkdownView): Promise<void> {
        if (!markdownView.file) return;
        
        const doc = await this.documentStructureService.buildHeaderTree(this.app, markdownView.file);
        
        // Vérifier si section Résultat existe déjà
        const existingResultNode = this.documentStructureService.findFirstNodeMatchingHeading(doc.root, INFORMATION_SYNTHESIS_SECTIONS.RESULT);
        
        if (existingResultNode) {
            // Remplacer la section existante
            existingResultNode.content = '';
            existingResultNode.children = [];
        } else {
            // Créer nouvelle section
            const resultHeader = {
                level: 1,
                heading: INFORMATION_SYNTHESIS_SECTIONS.RESULT,
                content: '',
                children: []
            };
            doc.root.children.push(resultHeader);
        }

        // Sauvegarder
        const newContent = this.documentStructureService.renderToMarkdown(doc.root);
        await this.app.vault.modify(markdownView.file, newContent);
    }

    private async processFilesWithProgress(markdownView: MarkdownView, dto: InformationResearchDTO): Promise<void> {
        let isCancelled = false;
        const loadingModal = new LoadingModal(this.app, () => {
            isCancelled = true;
        }, 'Initialisation...');
        loadingModal.open();

        try {
            loadingModal.updateTitle(INFORMATION_SYNTHESIS_MESSAGES.RESEARCH_TITLE);
            
            for (let i = 0; i < dto.filePaths.length; i++) {
                if (isCancelled) {
                    new Notice(INFORMATION_SYNTHESIS_MESSAGES.OPERATION_CANCELLED);
                    return;
                }
                
                const filePath = dto.filePaths[i];
                const fileName = filePath.split('/').pop() || filePath;
                
                // Mise à jour de la progression
                loadingModal.updateProgress(`Traitement du fichier ${i + 1} sur ${dto.filePaths.length}: ${fileName}`);
                
                // Traitement d'un fichier
                const result = await this.processFile(filePath, dto.question);
                
                // Insertion immédiate du résultat
                await this.insertResultInActiveFile(markdownView, fileName, result);
            }
            
            loadingModal.updateProgress(INFORMATION_SYNTHESIS_MESSAGES.PROCESSING_FINISHED);
            
        } finally {
            // Petit délai pour voir le message final
            setTimeout(() => loadingModal.forceClose(), 500);
        }
    }

    private async processFile(filePath: string, question: string): Promise<string> {
        try {
            // Utiliser la méthode Obsidian pour résoudre les liens
            const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(filePath, '');
            
            if (!resolvedFile) {
                return `⚠️ Fichier ${filePath} introuvable.`;
            }

            // Lire la structure du fichier
            const doc = await this.documentStructureService.buildHeaderTree(this.app, resolvedFile);
            
            // Extraire le contenu de la section configurée
            const transcriptNode = this.documentStructureService.findFirstNodeMatchingHeading(
                doc.root, 
                this.settings.headerContainingTranscript
            );
            
            if (!transcriptNode) {
                return `⚠️ Aucune section "${this.settings.headerContainingTranscript}" trouvée dans ce fichier.`;
            }

            const content = transcriptNode.content;
            if (!content.trim()) {
                return `⚠️ La section "${this.settings.headerContainingTranscript}" est vide dans ce fichier.`;
            }

            // Appel IA
            return await this.informationResearchService.researchInformation(question, content);
            
        } catch (error) {
            console.error(`EditorInformationResearchService: Erreur lors du traitement du fichier ${filePath}:`, error);
            return `⚠️ Erreur lors de l'analyse de ce fichier: ${error.message}`;
        }
    }

    private async insertResultInActiveFile(markdownView: MarkdownView, fileName: string, result: string): Promise<void> {
        if (!markdownView.file) return;
        
        try {
            // Vérifier que le cache est encore valide avant de continuer
            const metadataCheck = this.app.metadataCache.getFileCache(markdownView.file);
            if (!metadataCheck) {
                await new Promise(resolve => setTimeout(resolve, 100));
                const metadataRetry = this.app.metadataCache.getFileCache(markdownView.file);
                if (!metadataRetry) {
                    throw new Error('Cache metadata invalide pour le fichier actif');
                }
            }
            
            const doc = await this.documentStructureService.buildHeaderTree(this.app, markdownView.file);
        
            // Trouver la section Résultat
            const resultNode = this.documentStructureService.findFirstNodeMatchingHeading(doc.root, INFORMATION_SYNTHESIS_SECTIONS.RESULT);
            if (!resultNode) {
                new Notice('Erreur: Section Résultat introuvable');
                return;
            }

            // Ajouter le nouveau résultat comme sous-section
            const fileResultHeader = {
                level: 2,
                heading: fileName,
                content: result,
                children: []
            };
            
            resultNode.children.push(fileResultHeader);

            // Sauvegarder
            const newContent = this.documentStructureService.renderToMarkdown(doc.root);
            await this.app.vault.modify(markdownView.file, newContent);
        } catch (error) {
            throw error;
        }
    }
}