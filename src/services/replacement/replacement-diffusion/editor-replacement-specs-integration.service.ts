import { App, MarkdownView, Notice } from 'obsidian';
import { DocumentStructureService } from '../../document/document-structure.service';
import { YamlService } from '../../document/yaml.service';
import { ReplacementSpecsError, YamlValidationError } from '../../../models/errors';
import { ReplacementSpec, ReplacementSpecs } from '../../../models/schemas';
import {
    ReplacementSpecsIntegrationService,
    ReplacementSpecsIntegrationSummary
} from './replacement-specs-integration.service';
import { TaggedFilesService } from '../../document/tagged-files.service';
import { ReplacementSpecsAnalysisModal } from './ui/replacement-specs-analysis.modal';
import { ReplacementSpecsFile } from '../../../models/interfaces';
import { EditorReplacementSpecsStorageService } from "../editor-replacement-specs-storage.service";

export class EditorReplacementSpecsIntegrationService {
    constructor(
        private app: App,
        private yamlReplacementService: YamlService<ReplacementSpecs>,
        private editorReplacementSpecsStorageService: EditorReplacementSpecsStorageService,
        private documentStructureService: DocumentStructureService,
        private replacementSpecsIntegrationService: ReplacementSpecsIntegrationService,
        private taggedFilesService: TaggedFilesService
    ) {}

    /**
     * Publie les specs du fichier actif vers le vault
     */
    public async publishCurrentFileSpecs(
        markdownView: MarkdownView,
        replacementSpecsTag: string,
        replacementsHeader: string
    ): Promise<void> {
        try {
            console.log('Début de publishCurrentFileSpecs');
            console.log('Paramètres:', { replacementSpecsTag, replacementsHeader });

            // 1. Analyser les possibilités d'intégration
            const analysis = await this.analyzeCurrentFileSpecs(
                markdownView,
                replacementSpecsTag,
                replacementsHeader
            );

            if (!analysis) {
                console.log('Pas de specs trouvées dans le fichier actif');
                new Notice('Pas de specs trouvées dans le fichier actif');
                return;
            }

            console.log('Analyse terminée:', analysis);

            // 2. Demander à l'utilisateur de choisir les intégrations
            const userChoices = await new ReplacementSpecsAnalysisModal(
                this.app,
                analysis.analysis,
                analysis.replacementSpecsFiles.map(specsFile => specsFile.specs.category)
            ).open();

            if (!userChoices) {
                console.log('Annulation par l\'utilisateur');
                return;
            }

            console.log('Choix utilisateur:', userChoices);

            // 3. Effectuer les intégrations
            await this.integrateSpecs(userChoices, analysis.replacementSpecsFiles);

            new Notice('Specs intégrées avec succès');
            console.log('Fin de publishCurrentFileSpecs avec succès');
        } catch (error) {
            console.error('Erreur dans publishCurrentFileSpecs:', error);
            new Notice('Erreur: ' + error.message);
            throw error;
        }
    }

    private async integrateSpecs(
        userChoices: UserIntegrationChoices,
        replacementSpecsFiles: ReplacementSpecsFile[]
    ): Promise<void> {
        console.log('Début de integrateSpecs');
        console.log('Choix utilisateur:', userChoices);
        console.log('Catégories existantes avant intégration:', replacementSpecsFiles);

        // Map pour éviter de sauvegarder plusieurs fois le même fichier
        const modifiedFiles = new Map<string, ReplacementSpecs>();

        for (const integration of userChoices.integrations) {
            // Trouver la catégorie existante
            const category = replacementSpecsFiles.find(c => c.specs.category === integration.targetCategory);
            if (!category) {
                throw new Error(`La catégorie ${integration.targetCategory} n'existe pas`);
            }

            console.log(`Intégration pour la catégorie ${category.specs.category} dans le fichier ${category.file}`);
            console.log('Specs avant intégration:', category.specs);
            console.log('Specs à intégrer:', integration.specsToIntegrate);

            // Intégrer les specs
            this.replacementSpecsIntegrationService.integrateReplacementSpecs(
                category.specs,
                integration.specsToIntegrate
            );

            console.log('Specs après intégration:', category.specs);
            modifiedFiles.set(category.file, category.specs);
        }

        // Sauvegarder les fichiers modifiés
        console.log('Fichiers à modifier:', Array.from(modifiedFiles.entries()));
        const replacementFilesToSave = Array.from(modifiedFiles.entries()).map(([file, specs]) => ({
            file,
            specs
        }));

        for (const specFile of replacementFilesToSave) {
            await this.editorReplacementSpecsStorageService.persistSpecsInTaggedFile(specFile);
        }

        console.log('Fin de integrateSpecs');
    }

    /**
     * Collect replacement specs from files tagged with the given tag
     */
    private async collectExistingSpecs(replacementSpecsTag: string): Promise<FileSpecs[]> {
        console.log('Début de collectExistingSpecs avec tag:', replacementSpecsTag);

        const taggedFiles = this.taggedFilesService.findTaggedFiles(replacementSpecsTag);
        console.log(`Found ${taggedFiles.length} files with tag ${replacementSpecsTag}:`, taggedFiles);

        const specs: FileSpecs[] = [];
        for (const file of taggedFiles) {
            try {
                console.log(`Lecture du fichier ${file.path}`);
                const content = await this.app.vault.read(file);
                console.log('Contenu du fichier:', content);

                // Parser le YAML des specs directement depuis le contenu du fichier
                try {
                    const yamlContent = this.yamlReplacementService.fromYamlBlock(content);
                    console.log('YAML extrait:', yamlContent);

                    const fileSpecs = this.yamlReplacementService.fromYaml(yamlContent, file.path);
                    console.log('Specs parsées:', fileSpecs);

                    specs.push({ file: file.path, specs: fileSpecs });
                } catch (error) {
                    console.error(`Erreur lors du parsing YAML du fichier ${file.path}:`, error);
                    if (error instanceof YamlValidationError) {
                        throw new ReplacementSpecsError(error.details, file.path);
                    } else {
                        throw new ReplacementSpecsError('Failed to parse replacement specs', file.path);
                    }
                }
            } catch (error) {
                console.error(`Erreur lors du traitement du fichier ${file.path}:`, error);
                if (error instanceof ReplacementSpecsError) {
                    throw error;
                } else {
                    throw new ReplacementSpecsError('Unexpected error while processing file', file.path);
                }
            }
        }

        console.log('Specs collectées:', specs);
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
            console.log('Début de analyzeCurrentFileSpecs');

            const replacementSpecsFile = await this.editorReplacementSpecsStorageService.readSpecsFromActiveFile(markdownView.file!);

            this.replacementSpecsIntegrationService.checkSpecsIntegrity(replacementSpecsFile.specs);

            // 2. Collecter les specs existantes et construire le mapping des catégories
            console.log('Collecte des specs existantes avec le tag', replacementSpecsTag);
            const replacementSpecsFiles: ReplacementSpecsFile[] = await this.editorReplacementSpecsStorageService.readSpecsFromTaggedFiles(replacementSpecsTag);
            console.log('Specs existantes trouvées:', replacementSpecsFiles);

            // 3. Retourner l'analyse
            const analysis = this.replacementSpecsIntegrationService
                .determineHowToIntegrateSpecs(
                    replacementSpecsFiles.map(c => c.specs),
                    replacementSpecsFile.specs.replacements
                );

            console.log('Analyse des intégrations:', analysis);

            return {
                analysis,
                replacementSpecsFiles
            };
        } catch (error) {
            console.error('Erreur dans analyzeCurrentFileSpecs:', error);
            if (error instanceof ReplacementSpecsError) {
                console.error(`Error analyzing specs: ${error.message} in ${error.filePath}`);
            } else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    }
}

interface AnalysisWithCategories {
    analysis: ReplacementSpecsIntegrationSummary;
    replacementSpecsFiles: ReplacementSpecsFile[];
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
