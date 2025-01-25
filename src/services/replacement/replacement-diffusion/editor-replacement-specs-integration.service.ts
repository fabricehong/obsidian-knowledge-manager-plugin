import { App, MarkdownView, Notice } from 'obsidian';
import { DocumentStructureService } from '../../document/document-structure.service';
import { YamlService } from '../../document/yaml.service';
import { YamlValidationError, ReplacementSpecsError } from '../../../models/errors';
import { ReplacementSpecs } from '../../../models/schemas';
import { ReplacementSpecsIntegrationService, ReplacementSpecsIntegrationSummary } from './replacement-specs-integration.service';
import { TaggedFilesService } from '../../document/tagged-files.service';
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
            const analysis = await this.analyzeCurrentFileSpecs(
                markdownView,
                replacementSpecsTag,
                replacementsHeader
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

    /**
     * Analyse les possibilités d'intégration des specs du fichier actif
     * @returns L'analyse d'intégration ou null si pas de specs trouvées
     * @private
     */
    private async analyzeCurrentFileSpecs(
        markdownView: MarkdownView,
        replacementSpecsTag: string,
        replacementsHeader: string
    ): Promise<ReplacementSpecsIntegrationSummary | null> {
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

            // 2. Collecter les specs existantes
            const existingSpecs = await this.collectExistingSpecs(replacementSpecsTag);

            // 3. Retourner l'analyse
            return this.replacementSpecsIntegrationService
                .integrateSpecs(existingSpecs, currentSpecs.replacements);
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

    /**
     * Collect replacement specs from files tagged with the given tag
     */
    private async collectExistingSpecs(replacementSpecsTag: string): Promise<ReplacementSpecs[]> {
        const taggedFiles = this.taggedFilesService.findTaggedFiles(replacementSpecsTag);
        console.log(`Found ${taggedFiles.length} files with tag ${replacementSpecsTag}`);

        const specs: ReplacementSpecs[] = [];
        for (const file of taggedFiles) {
            try {
                const content = await this.app.vault.read(file);
                
                // Parser le YAML des specs directement depuis le contenu du fichier
                try {
                    const yamlContent = this.yamlReplacementService.fromYamlBlock(content);
                    const fileSpecs = this.yamlReplacementService.fromYaml(yamlContent, file.path);
                    specs.push(fileSpecs);
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
}
