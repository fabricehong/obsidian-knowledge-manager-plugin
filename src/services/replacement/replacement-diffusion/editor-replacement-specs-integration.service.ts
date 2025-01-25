import { App, MarkdownView, TFile, Notice } from 'obsidian';
import { DocumentStructureService } from '../../document/document-structure.service';
import { YamlService } from '../../document/yaml.service';
import { YamlValidationError } from '../../../models/errors';
import { ReplacementSpecs } from '../../../models/schemas';
import { ReplacementSpec } from '../../../models/schemas';
import { ReplacementSpecsIntegrationService, ReplacementSpecsIntegrationSummary } from './replacement-specs-integration.service';
import { TaggedFilesService } from '../../document/tagged-files.service';
import { ReplacementSpecsError } from '../../../models/errors';
import { ReplacementSpecsAnalysisModal } from './ui/replacement-specs-analysis.modal';

export class EditorReplacementSpecsIntegrationService {
    constructor(
        private app: App,
        private documentStructureService: DocumentStructureService,
        private yamlReplacementService: YamlService<ReplacementSpecs>,
        private replacementSpecsIntegrationService: ReplacementSpecsIntegrationService,
        private taggedFilesService: TaggedFilesService
    ) {}

    /**
     * Publie les specs du fichier actif vers le vault
     */
    async publishCurrentFileSpecs(
        markdownView: MarkdownView,
        replacementSpecsTag: string,
        replacementsHeader: string
    ): Promise<void> {
        try {
            const analysisWithCategories = await this.analyzeCurrentFileSpecs(markdownView, replacementSpecsTag, replacementsHeader);
            if (!analysisWithCategories) {
                new Notice('Pas de specs trouvées dans le fichier actif');
                return;
            }

            const userChoices = await new ReplacementSpecsAnalysisModal(
                this.app, 
                analysisWithCategories.analysis,
                analysisWithCategories.existingCategories
            ).open();

            await this.integrateSpecs(userChoices, analysisWithCategories.existingCategories);
            new Notice('Specs intégrées avec succès');
        } catch (error) {
            new Notice('Erreur: ' + error.message);
        }
    }

    private async integrateSpecs(
        userChoices: UserIntegrationChoices,
        existingCategories: ExistingCategory[]
    ): Promise<void> {
        // Map pour éviter de sauvegarder plusieurs fois le même fichier
        const modifiedFiles = new Map<string, ReplacementSpecs>();

        for (const integration of userChoices.integrations) {
            // Trouver la catégorie existante
            const category = existingCategories.find(c => c.name === integration.targetCategory);
            if (!category) {
                throw new Error(`La catégorie ${integration.targetCategory} n'existe pas`);
            }

            // Intégrer les specs
            this.replacementSpecsIntegrationService.integrateReplacementSpecs(
                category.specs,
                integration.specsToIntegrate
            );
            
            modifiedFiles.set(category.file, category.specs);
        }

        // Sauvegarder les fichiers modifiés
        for (const [file, specs] of modifiedFiles) {
            // Récupérer le fichier
            const abstractFile = this.app.vault.getAbstractFileByPath(file);
            if (!abstractFile || !(abstractFile instanceof TFile)) {
                throw new Error(`Le fichier ${file} n'existe pas ou n'est pas un fichier`);
            }
            
            // Lire le contenu actuel du fichier pour préserver le frontmatter
            const content = await this.app.vault.read(abstractFile);
            const metadata = this.app.metadataCache.getFileCache(abstractFile);
            
            // Extraire le frontmatter existant
            const frontmatterEnd = metadata?.frontmatterPosition?.end.offset ?? 0;
            const frontmatter = content.slice(0, frontmatterEnd);
            
            // Convertir les specs en YAML
            const yamlContent = this.yamlReplacementService.toYaml(specs);
            
            // Construire le nouveau contenu en préservant le frontmatter
            const newContent = frontmatter + '\n\n' + yamlContent;
            
            // Sauvegarder le fichier
            await this.app.vault.modify(abstractFile, newContent);
        }
    }

    /**
     * Collect replacement specs from files tagged with the given tag
     */
    private async collectExistingSpecs(replacementSpecsTag: string): Promise<FileSpecs[]> {
        const taggedFiles = this.taggedFilesService.findTaggedFiles(replacementSpecsTag);
        console.log(`Found ${taggedFiles.length} files with tag ${replacementSpecsTag}`);

        const specs: FileSpecs[] = [];
        for (const file of taggedFiles) {
            try {
                const content = await this.app.vault.read(file);
                
                // Parser le YAML des specs directement depuis le contenu du fichier
                try {
                    const yamlContent = this.yamlReplacementService.fromYamlBlock(content);
                    const fileSpecs = this.yamlReplacementService.fromYaml(yamlContent, file.path);
                    specs.push({ file: file.path, specs: fileSpecs });
                } catch (error) {
                    if (error instanceof YamlValidationError) {
                        throw new ReplacementSpecsError(error.details, file.path);
                    } else {
                        throw new ReplacementSpecsError('Failed to parse replacement specs', file.path);
                    }
                }
            } catch (error) {
                if (error instanceof ReplacementSpecsError) {
                    throw error;
                } else {
                    throw new ReplacementSpecsError('Unexpected error while processing file', file.path);
                }
            }
        }

        return specs;
    }

    /**
     * Analyse les possibilités d'intégration des specs du fichier actif
     * @returns L'analyse d'intégration ou null si pas de specs trouvées
     * @private
     */
    private async analyzeCurrentFileSpecs(
        markdownView: MarkdownView,
        replacementSpecsTag: string,
        replacementsHeader: string
    ): Promise<AnalysisWithCategories | null> {
        try {
            // 1. Extraire les specs du fichier actif
            const currentSpecsString = await this.collectActiveFileSpecsString(
                markdownView,
                replacementsHeader
            );
            if (!currentSpecsString) return null;

            // Parser le YAML des specs
            let currentSpecs: ReplacementSpecs;
            try {
                const yamlContent = this.yamlReplacementService.fromYamlBlock(currentSpecsString.content);
                currentSpecs = this.yamlReplacementService.fromYaml(yamlContent, currentSpecsString.filePath);
            } catch (error) {
                if (error instanceof YamlValidationError) {
                    throw new ReplacementSpecsError(error.details, currentSpecsString.filePath);
                } else {
                    throw new ReplacementSpecsError('Failed to parse replacement specs', currentSpecsString.filePath);
                }
            }

            this.replacementSpecsIntegrationService.checkSpecsIntegrity(currentSpecs);

            // 2. Collecter les specs existantes et construire le mapping des catégories
            const fileSpecs = await this.collectExistingSpecs(replacementSpecsTag);
            const existingCategories: ExistingCategory[] = [];
            
            // Pour chaque fichier, extraire les catégories
            for (const {file, specs} of fileSpecs) {
                Object.keys(specs).forEach(category => {
                    existingCategories.push({
                        name: category,
                        file,
                        specs
                    });
                });
            }

            // 3. Retourner l'analyse
            const analysis = this.replacementSpecsIntegrationService
                .determineHowToIntegrateSpecs(
                    existingCategories.map(c => ({
                        category: c.name,
                        replacements: c.specs.replacements
                    })),
                    currentSpecs.replacements
                );

            return {
                analysis,
                existingCategories
            };
        } catch (error) {
            if (error instanceof ReplacementSpecsError) {
                console.error(`Error analyzing specs: ${error.message} in ${error.filePath}`);
            } else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    }

    /**
     * Collect replacement specs from the active file
     */
    private async collectActiveFileSpecsString(
        markdownView: MarkdownView, 
        replacementsHeader: string
    ): Promise<{content: string, filePath: string} | null> {
        const file = markdownView.file;
        if (!file) return null;

        // Lire le contenu et construire l'arbre
        const content = await this.app.vault.read(file);
        const metadata = this.app.metadataCache.getFileCache(file);
        if (!metadata) return null;

        const doc = this.documentStructureService.buildHeaderTree(metadata, content);

        // Trouver le header des replacements
        const replacementsNode = this.documentStructureService.findFirstNodeMatchingHeading(
            doc,
            replacementsHeader
        );
        if (!replacementsNode?.content) return null;

        return {
            content: replacementsNode.content,
            filePath: file.path
        };
    }
}

export interface ExistingCategory {
    name: string;
    file: string;
    specs: ReplacementSpecs;
}

interface AnalysisWithCategories {
    analysis: ReplacementSpecsIntegrationSummary;
    existingCategories: ExistingCategory[];
}

interface FileSpecs {
    file: string;
    specs: ReplacementSpecs;
}

interface UserIntegrationChoices {
    integrations: {
        targetCategory: string;
        specsToIntegrate: ReplacementSpec[];
    }[];
}
