import { App } from "obsidian";
import { VocabularySpecs, VocabularySpecSchema } from "../../models/schemas";
import { YamlValidationError } from "../../models/errors";
import { z } from "zod";
import { load } from "js-yaml";

export class VocabularySpecsParsingService {
    constructor(private app: App) {}

    /**
     * Parse vocabulary specs from YAML content
     */
    parseVocabularySpecs(content: string): VocabularySpecs {
        try {
            const parsed = load(content);
            const validated = VocabularySpecSchema.parse(parsed);
            return validated;
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new YamlValidationError(
                    'Invalid vocabulary specs',
                    '',
                    `Failed to parse vocabulary specs: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
                );
            }
            throw new YamlValidationError(
                'Invalid vocabulary specs',
                '',
                `Failed to parse vocabulary specs: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }
    
}
