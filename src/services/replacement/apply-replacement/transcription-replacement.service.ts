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
    constructor() {}

    /**
     * Applies text replacements according to the provided specifications.
     * 
     * Business Rules:
     * 1. Word Boundary Rules:
     *    - Only replaces complete words (e.g., "ve" won't match inside "Genève")
     *    - Handles both accented and unaccented characters
     *    - Treats numbers as part of words (e.g., "nova14" is one word)
     * 
     * 2. Pattern Matching:
     *    - Normal terms: Treated as literal text with special characters escaped
     *    - Regex patterns: Must be enclosed in slashes (e.g., "/nova.?14/")
     *    - Case-insensitive matching (using 'i' flag)
     * 
     * 3. Replacement Logic:
     *    - Multiple occurrences: All matching instances are replaced
     *    - Multiple specs: Processes each spec independently
     *    - Order: Processes longest terms first to prevent partial matches
     *            (e.g., "New York City" before "New York" to avoid partial replacement)
     *    - Reports: Generates a report for each spec with replacement counts
     * 
     * 4. Special Cases:
     *    - Empty replacements: Returns original content with empty report
     *    - Special characters: In normal terms, treated as literal text
     *    - Overlapping matches: Longer matches take precedence over shorter ones
     * 
     * @example
     * // Simple replacement
     * const specs = {
     *   category: 'Speakers',
     *   replacements: [{ target: 'John Smith', toSearch: ['John'] }]
     * };
     * service.applyReplacements('John: Hello', [specs]);
     * // Returns: { result: 'John Smith: Hello', reports: [{ category: 'Speakers', replacements: [1] }] }
     * 
     * // Regex pattern
     * const specs = {
     *   category: 'Test',
     *   replacements: [{ target: 'NOVA', toSearch: ['/nova.?14/'] }]
     * };
     * service.applyReplacements('nova14 nova-14', [specs]);
     * // Returns: { result: 'NOVA NOVA', reports: [{ category: 'Test', replacements: [2] }] }
     * 
     * @param content - The text content to process
     * @param specs - Array of replacement specifications
     * @returns Object containing the processed text and replacement reports
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
                const regex = new RegExp(`(${pattern})`, 'giu');
                
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
     * createSearchPattern("nova-14") -> "(?:(?<!(?:\\p{L}|\\p{N}))(?=(?:\\p{L}|\\p{N}))|(?<=(?:\\p{L}|\\p{N}))(?!(?:\\p{L}|\\p{N})))nova-14(?:(?<!(?:\\p{L}|\\p{N}))(?=(?:\\p{L}|\\p{N}))|(?<=(?:\\p{L}|\\p{N}))(?!(?:\\p{L}|\\p{N})))"
     * createSearchPattern("/nova.?14/") -> "(?:(?<!(?:\\p{L}|\\p{N}))(?=(?:\\p{L}|\\p{N}))|(?<=(?:\\p{L}|\\p{N}))(?!(?:\\p{L}|\\p{N})))nova.?14(?:(?<!(?:\\p{L}|\\p{N}))(?=(?:\\p{L}|\\p{N}))|(?<=(?:\\p{L}|\\p{N}))(?!(?:\\p{L}|\\p{N})))"
     * 
     * @param term The search term to convert into a pattern
     * @returns The regex pattern with word boundaries
     */
    private createSearchPattern(term: string): string {
        // Define word boundary pattern using Unicode categories for letters and numbers
        const wordBoundary = '(?:(?<!(?:\\p{L}|\\p{N}))(?=(?:\\p{L}|\\p{N}))|(?<=(?:\\p{L}|\\p{N}))(?!(?:\\p{L}|\\p{N})))';

        // Check if the term is a regex pattern (surrounded by /)
        if (term.startsWith('/') && term.endsWith('/')) {
            // Extract the pattern between the slashes and add word boundaries
            const pattern = term.slice(1, -1);
            return `${wordBoundary}${pattern}${wordBoundary}`;
        }

        // For normal terms, escape regex special characters and add word boundaries
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return `${wordBoundary}${escapedTerm}${wordBoundary}`;
    }
}
