import { ReplacementSpec, ReplacementSpecs } from "../models/interfaces";
import * as yaml from 'yaml';

export class TranscriptionReplacementService {
    /**
     * Converts a ReplacementSpecs object into YAML format
     */
    toYaml(specs: ReplacementSpecs): string {
        const yamlObj = {
            [specs.category]: {
                replacements: specs.replacements.map(rep => ({
                    target: rep.target,
                    toSearch: rep.toSearch
                }))
            }
        };
        return yaml.stringify(yamlObj);
    }

    /**
     * Wraps a YAML string in a code block
     */
    toYamlBlock(yamlContent: string): string {
        return `\`\`\`yaml\n${yamlContent.trim()}\n\`\`\``;
    }

    /**
     * Extracts YAML content from a code block
     */
    fromYamlBlock(content: string): string {
        const match = content.match(/```yaml\n([\s\S]*?)\n```/);
        return match ? match[1] : content;
    }

    /**
     * Parses a YAML string into a ReplacementSpecs object
     */
    fromYaml(yamlContent: string): ReplacementSpecs {
        const parsed = yaml.parse(yamlContent);
        const category = Object.keys(parsed)[0];
        const replacements: ReplacementSpec[] = parsed[category].replacements.map((rep: any) => ({
            target: rep.target,
            toSearch: rep.toSearch
        }));

        return {
            category,
            replacements
        };
    }

    /**
     * Creates a ReplacementSpecs object from a list of speakers
     */
    createFromSpeakers(speakers: string[]): ReplacementSpecs {
        return {
            category: 'Speakers',
            replacements: speakers.map(speaker => ({
                target: speaker,
                toSearch: [speaker]
            }))
        };
    }

    /**
     * Applies replacement specs to a text content
     * @param content The text content to apply replacements to
     * @param specs The replacement specifications
     * @returns The text with all replacements applied
     */
    applyReplacements(content: string, specs: ReplacementSpecs): string {
        let result = content;
        
        // Sort replacements by length of search terms (longest first)
        // This ensures that "John Smith" is replaced before "John"
        const sortedReplacements = [...specs.replacements].sort((a, b) => {
            const maxLengthA = Math.max(...a.toSearch.map(s => s.length));
            const maxLengthB = Math.max(...b.toSearch.map(s => s.length));
            return maxLengthB - maxLengthA;
        });

        // First pass: replace with temporary tokens
        const tempTokens = new Map<string, string>();
        let tokenCounter = 0;

        for (const replacement of sortedReplacements) {
            // Sort search terms by length (longest first)
            const sortedSearchTerms = [...replacement.toSearch].sort((a, b) => b.length - a.length);
            for (const searchTerm of sortedSearchTerms) {
                // Escape special regex characters and add word boundary
                const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escapedTerm}\\b`, 'g');
                
                // Create a unique temporary token
                const tempToken = `__TEMP_TOKEN_${tokenCounter++}__`;
                tempTokens.set(tempToken, replacement.target);
                
                result = result.replace(regex, tempToken);
            }
        }

        // Second pass: replace temporary tokens with final values
        for (const [token, target] of tempTokens) {
            result = result.replace(new RegExp(token, 'g'), target);
        }

        return result;
    }
}
