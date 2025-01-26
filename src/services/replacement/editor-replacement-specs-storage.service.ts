import { App, TFile } from "obsidian";
import { YamlService } from "../document/yaml.service";
import { ReplacementSpecsFile } from "../../models/interfaces";
import { ReplacementSpecs } from "../../models/schemas";
import { ReplacementSpecsError } from "../../models/errors";
import { YamlValidationError } from "../../models/errors";
import { TaggedFilesService } from "../document/tagged-files.service";

export class EditorReplacementSpecsStorageService {
    constructor(
        private app: App,
        private yamlReplacementService: YamlService<ReplacementSpecs>,
        private taggedFilesService: TaggedFilesService
    ) {}

    async readSpecsFromTaggedFiles(tag: string): Promise<ReplacementSpecsFile[]> {
        console.log('Début de readSpecsFromTaggedFiles avec tag:', tag);
        
        const taggedFiles = this.taggedFilesService.findTaggedFiles(tag);
        console.log(`Found ${taggedFiles.length} files with tag ${tag}:`, taggedFiles);

        const specs: ReplacementSpecsFile[] = [];
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

    async persistSpecsInTaggedFile(specFile: ReplacementSpecsFile): Promise<void> {
        console.log(`Sauvegarde du fichier ${specFile.file}`);
            
        // Récupérer le fichier
        const abstractFile = this.app.vault.getAbstractFileByPath(specFile.file);
        if (!abstractFile || !(abstractFile instanceof TFile)) {
            throw new Error(`Le fichier ${specFile.file} n'existe pas ou n'est pas un fichier`);
        }
        
        // Lire le contenu actuel du fichier pour préserver le frontmatter
        const content = await this.app.vault.read(abstractFile);
        console.log('Contenu actuel du fichier:', content);
        
        const metadata = this.app.metadataCache.getFileCache(abstractFile);
        
        // Extraire le frontmatter existant
        const frontmatterEnd = metadata?.frontmatterPosition?.end.offset ?? 0;
        const frontmatter = content.slice(0, frontmatterEnd);
        console.log('Frontmatter extrait:', frontmatter);
        
        // Convertir le spec en YAML
        const yamlContent = this.yamlReplacementService.toYaml(specFile.specs);
        const yamlBlock = this.yamlReplacementService.toYamlBlock(yamlContent);
        console.log('Nouveau contenu YAML:', yamlContent);
        
        // Construire le nouveau contenu en préservant le frontmatter
        const newContent = frontmatter + '\n\n' + yamlBlock;
        console.log('Nouveau contenu complet:', newContent);
        
        // Sauvegarder le fichier
        await this.app.vault.modify(abstractFile, newContent);
        console.log(`Fichier ${specFile.file} sauvegardé`);
    }
}
