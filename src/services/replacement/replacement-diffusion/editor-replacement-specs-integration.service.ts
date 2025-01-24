import { App, MarkdownView } from 'obsidian';
import { DocumentStructureService } from '../../document/document-structure.service';
import { YamlService } from '../../document/yaml.service';
import { ReplacementSpecs } from '../../../models/schemas';
import { ReplacementSpecsIntegrationService, ReplacementSpecsIntegrationSummary } from './replacement-specs-integration.service';
import { TaggedFilesService } from '../../document/tagged-files.service';

export class EditorReplacementSpecsIntegrationService {
    constructor(
        private app: App,
        private documentStructureService: DocumentStructureService,
        private yamlReplacementService: YamlService<ReplacementSpecs>,
        private replacementSpecsIntegrationService: ReplacementSpecsIntegrationService,
        private taggedFilesService: TaggedFilesService
    ) {}

    /**
     * Analyse les possibilités d'intégration des specs du fichier actif
     * @returns L'analyse d'intégration ou null si pas de specs trouvées
     */
    async analyzeCurrentFileSpecs(
        markdownView: MarkdownView,
        replacementSpecsTag: string,
        replacementsHeader: string
    ): Promise<ReplacementSpecsIntegrationSummary | null> {
        // 1. Extraire les specs du fichier actif
        const currentSpecsString = await this.collectActiveFileSpecsString(
            markdownView,
            replacementsHeader
        );
        if (!currentSpecsString) return null;

        // Parser le YAML des specs
        let currentSpecs: ReplacementSpecs;
        try {
            currentSpecs = this.yamlReplacementService.fromYaml(currentSpecsString.content, currentSpecsString.filePath);
        } catch (error) {
            console.error('Failed to parse replacement specs:', error);
            return null;
        }

        // 2. Collecter les specs existantes
        const existingSpecs = await this.collectExistingSpecs(replacementSpecsTag);

        // 3. Retourner l'analyse
        return this.replacementSpecsIntegrationService
            .integrateSpecs(existingSpecs, currentSpecs.replacements);
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

    private async collectExistingSpecs(
        replacementSpecsTag: string
    ): Promise<ReplacementSpecs[]> {
        // Trouver tous les fichiers taggés
        const taggedFiles = this.taggedFilesService.findTaggedFiles(replacementSpecsTag);
        const specs: ReplacementSpecs[] = [];

        // Collecter les specs de chaque fichier
        for (const file of taggedFiles) {
            try {
                const content = await this.app.vault.read(file);
                const spec = this.yamlReplacementService.fromYaml(content, file.path);
                specs.push(spec);
            } catch (error) {
                console.error(`Failed to parse specs from ${file.path}:`, error);
                continue;
            }
        }

        return specs;
    }
}
