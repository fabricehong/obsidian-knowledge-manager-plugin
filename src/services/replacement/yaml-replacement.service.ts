import { ReplacementSpecs, ReplacementSpecSchema } from "../../models/schemas";
import { YamlValidationError } from "../../models/errors";
import { z } from "zod";
import { load, dump } from "js-yaml";

export class YamlReplacementService {
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
     * Parse YAML string to ReplacementSpecs
     */
    parse(yamlContent: string, filePath: string): ReplacementSpecs {
        try {
            const parsed = load(yamlContent);
            return ReplacementSpecSchema.parse(parsed);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new YamlValidationError(
                    'Invalid YAML structure',
                    filePath,
                    error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
                );
            }
            throw new YamlValidationError(
                'Failed to parse YAML',
                filePath,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    /**
     * Convert ReplacementSpecs to YAML string
     */
    stringify(specs: ReplacementSpecs): string {
        return dump(specs, { indent: 2 });
    }
}
