import { z } from 'zod';
import { dump, load } from 'js-yaml';
import { YamlValidationError } from '../../models/errors';

/**
 * Generic service for handling YAML data processing with schema validation.
 * This service provides type-safe parsing, validation, and serialization of YAML content
 * using Zod schemas for runtime type checking.
 * 
 * Main responsibilities:
 * - Parsing and validating YAML content against defined schemas
 * - Extracting YAML content from code blocks
 * - Serializing data structures to YAML format
 * - Providing type-safe data handling with generic type support
 * 
 * @template T The type of data being handled, defined by the Zod schema
 * @since 1.0.0
 */
export class YamlService<T> {
    /**
     * Creates a new YamlService
     * @param schema The Zod schema to validate YAML content against
     * @param errorMessage The error message to use when validation fails
     */
    constructor(
        private schema: z.ZodSchema<T>,
        private errorMessage: string = 'Invalid YAML structure'
    ) {}

    /**
     * Extract YAML content from code block
     */
    fromYamlBlock(content: string): string {
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
            if (inYamlBlock && line.trim() === '```') {
                inYamlBlock = false;
                break;
            }
            if (inYamlBlock) {
                yamlLines.push(line);
            }
        }

        if (!foundBlock) {
            throw new Error('No YAML block found in content');
        }

        return yamlLines.join('\n');
    }

    /**
     * Convert YAML content to code block
     */
    toYamlBlock(content: string): string {
        return '```yaml\n' + content + '\n```';
    }

    /**
     * Parse YAML content and validate against schema
     */
    fromYaml(content: string, filePath: string = ''): T {
        try {
            const parsed = load(content);
            const result = this.schema.safeParse(parsed);
            if (!result.success) {
                throw new YamlValidationError(
                    this.errorMessage,
                    filePath,
                    result.error.message
                );
            }
            return result.data;
        } catch (error) {
            if (error instanceof YamlValidationError) {
                throw error;
            }
            throw new YamlValidationError(
                this.errorMessage,
                filePath,
                error instanceof Error ? error.message : String(error)
            );
        }
    }

    /**
     * Convert data to YAML string
     */
    toYaml(data: T): string {
        return dump(data);
    }
}
