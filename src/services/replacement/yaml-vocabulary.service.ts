import { App } from "obsidian";
import { VocabularySpecs, VocabularySpecSchema } from "../../models/schemas";
import { YamlValidationError } from "../../models/errors";
import { z } from "zod";
import { load, dump } from "js-yaml";

export class YamlVocabularyService {
    constructor(private app: App) {}

    /**
     * Extract YAML content from code block
     */
    fromBlock(content: string): string {
        const lines = content.split('\n');
        const yamlLines: string[] = [];
        let inYamlBlock = false;
        let foundBlock = false;

        for (const line of lines) {
            if (line.trim() === '```yaml') {
                inYamlBlock = true;
                foundBlock = true;
                continue;
            }
            if (line.trim() === '```' && inYamlBlock) {
                break;
            }
            if (inYamlBlock) {
                yamlLines.push(line);
            }
        }

        return foundBlock ? yamlLines.join('\n') : content;
    }

    /**
     * Wrap content in YAML code block
     */
    toBlock(content: string): string {
        return '```yaml\n' + content + '\n```';
    }

    /**
     * Parse YAML string to VocabularySpecs
     */
    parse(yamlContent: string, filePath: string): VocabularySpecs {
        try {
            const parsed = load(yamlContent);
            const validated = VocabularySpecSchema.parse(parsed);
            return validated;
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new YamlValidationError(
                    'Invalid vocabulary specs',
                    filePath,
                    `Failed to parse vocabulary specs: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
                );
            }
            throw new YamlValidationError(
                'Invalid vocabulary specs',
                filePath,
                `Failed to parse vocabulary specs: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Convert VocabularySpecs to YAML string
     */
    stringify(specs: VocabularySpecs): string {
        return dump(specs, { indent: 2 });
    }
}
