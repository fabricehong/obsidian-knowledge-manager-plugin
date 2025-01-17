import { dump, load } from 'js-yaml';
import { z } from 'zod';
import { ReplacementSpecSchema, ReplacementSpecs } from '../../models/schemas';
import { YamlValidationError } from '../../models/errors';

/**
 * Service for handling YAML blocks in markdown files
 */
export class ReplacementSpecsParsingService {
    /**
     * Extract YAML block from markdown content
     */
    public fromYamlBlock(content: string): string {
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
     * Wraps YAML content in a code block
     */
    public toYamlBlock(content: string): string {
        return '```yaml\n' + content + '\n```';
    }

    /**
     * Parse YAML content into ReplacementSpecs
     * @throws YamlValidationError if the YAML doesn't match ReplacementSpecs structure
     */
    public fromYaml(yamlContent: string, filePath: string): ReplacementSpecs {
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
    public toYaml(specs: ReplacementSpecs): string {
        return dump(specs, { indent: 2 });
    }
}
