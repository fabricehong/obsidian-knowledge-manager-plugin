import { App } from "obsidian";
import { VocabularySpecsFile } from "../../models/interfaces";
import { TaggedFilesService } from "../document/tagged-files.service";
import { VocabularySpecs } from "../../models/schemas";
import { YamlService } from "../document/yaml.service";

export class EditorVocabularySpecsStorageService {
    constructor(
        private app: App,
        private taggedFilesService: TaggedFilesService,
        private vocabularySpecsTag: string,
        private yamlVocabularyService: YamlService<VocabularySpecs>
    ) {}

    /**
     * Collect vocabulary specs from files tagged with the given tag
     */
    async readSpecsFromTaggedFiles(): Promise<VocabularySpecsFile[]> {
        const allSpecs: VocabularySpecsFile[] = [];
        const taggedFiles = this.taggedFilesService.findTaggedFiles(this.vocabularySpecsTag);

        for (const file of taggedFiles) {
            const content = await this.app.vault.read(file);
            const vocabularySpecs = this.processVocabularySpecs({content, filePath: file.path});
            allSpecs.push({
                voc: vocabularySpecs,
                file: file.path
            });
        }

        return allSpecs;
    }

    private processVocabularySpecs(file: {content: string, filePath: string}): VocabularySpecs {
        const yamlContent = this.yamlVocabularyService.fromYamlBlock(file.content);
        return this.yamlVocabularyService.fromYaml(yamlContent, file.filePath);
    }
}
