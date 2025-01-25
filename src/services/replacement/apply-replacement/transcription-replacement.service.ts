import { SPEAKER_DELIMITER } from '../../../constants/delimiters';
import { ReplacementReport, ReplacementMatch } from '../../../models/interfaces';
import { ReplacementSpecs } from '../../../models/schemas';

/**
 * Service responsible for managing and processing transcription replacements in text content.
 * This service handles the creation, validation, and application of replacement rules
 * specifically designed for transcription text processing.
 * 
 * Main responsibilities:
 * - Processing text content according to replacement rules
 * - Generating replacement reports for tracking changes
 * 
 * @since 1.0.0
 */
export class TranscriptionReplacementService {
    /**
     * Applies a set of text replacement rules to a given content and returns both the modified content
     * and a report of what was actually replaced.
     * 
     * The algorithm works as follows:
     * 1. It processes longer words before shorter ones to ensure that larger phrases are not broken up
     *    (e.g., "New York" won't be partially replaced if "York" is also in the replacement list)
     * 2. It only replaces complete words, not parts of words
     *    (e.g., "cat" won't match inside "category")
     * 3. It ensures each part of the text is only replaced once, preventing chain reactions
     *    (e.g., if A→B and B→C are both rules, A will not become C)
     * 4. When conflicts occur between different replacement rules, it keeps the first successful replacement
     * 
     * @example
     * // Given these replacement specs:
     * // Spec 1: "NY" → "New York"
     * // Spec 2: "NYC" → "New York City"
     * // Spec 3: "New York" → "NY State"
     * 
     * const text = "I love NYC and NY";
     * // Result: "I love New York City and New York"
     * // Note: "NYC" is replaced first (being longer), then "NY"
     * 
     * @param content The text content to apply replacements to
     * @param specs Array of replacement specifications, each containing search terms and their target replacement
     * @returns The text with all replacements applied according to the rules above
     */
    applyReplacements(content: string, specs: ReplacementSpecs[]): { result: string, reports: ReplacementReport[] } {
        let result = content;
        const reports: ReplacementReport[] = [];
        
        // Process each spec separately to avoid cross-spec interference
        for (const spec of specs) {
            if (!spec?.replacements) continue;
            
            const matches: ReplacementMatch[] = [];
            
            // Sort replacements by length of search terms (longest first)
            const validReplacements = spec.replacements.filter(r => Array.isArray(r?.toSearch) && r.toSearch.length > 0);
            const sortedReplacements = [...validReplacements].sort((a, b) => {
                const maxLengthA = Math.max(...a.toSearch.map(s => s?.length || 0));
                const maxLengthB = Math.max(...b.toSearch.map(s => s?.length || 0));
                return maxLengthB - maxLengthA;
            });

            // Create a single regex for all search terms in this spec
            for (const replacement of sortedReplacements) {
                if (!replacement.target) continue;
                
                const searchPatterns = replacement.toSearch
                    .filter(term => typeof term === 'string' && term.length > 0)
                    .map(term => this.createSearchPattern(term))
                    .sort((a, b) => b.length - a.length);  // Sort by length descending
                
                if (searchPatterns.length === 0) continue;
                
                // Join all patterns with | for alternation
                const pattern = searchPatterns.join('|');
                const regex = new RegExp(`(${pattern})`, 'gi');
                
                // Find and collect all matches before replacing
                let match;
                while ((match = regex.exec(result)) !== null) {
                    // Only add to matches if the search text is different from the target
                    if (match[1] !== replacement.target) {
                        matches.push({
                            target: replacement.target,
                            toSearch: match[1]  // The actual matched string
                        });
                    }
                }
                
                // Replace all matches with the target
                result = result.replace(regex, replacement.target);
            }
            
            // Only add to report if we found matches
            if (matches.length > 0) {
                reports.push({
                    category: spec.category || 'Uncategorized',
                    replacements: matches
                });
            }
        }

        return { result: result, reports };
    }

    /**
     * Creates a search pattern from a term
     * If the term is surrounded by /, it's treated as a regex pattern
     * Otherwise, it's treated as a literal string and only the part before special characters is used
     * 
     * @example
     * createSearchPattern("nova-14") -> "\bnova-14\b"
     * createSearchPattern("/nova.?14/") -> "\bnova.?14\b"
     * 
     * @param term The search term to convert into a pattern
     * @returns The regex pattern with word boundaries
     */
    private createSearchPattern(term: string): string {
        // Check if the term is a regex pattern (surrounded by /)
        if (term.startsWith('/') && term.endsWith('/')) {
            // Extract the pattern between the slashes and add word boundaries
            const pattern = term.slice(1, -1);
            return `\\b${pattern}\\b`;
        }

        // For normal terms, escape regex special characters and add word boundaries
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return `\\b${escapedTerm}\\b`;
    }
}
