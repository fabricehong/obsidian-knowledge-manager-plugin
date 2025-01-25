import { ReplacementSpecs } from '../../models/schemas';
import { Term } from '../../types/glossary';

/**
 * Service responsible for managing glossary term replacements.
 * This class handles the conversion of glossary terms into standardized
 * replacement specifications for consistent use throughout the application.
 * 
 * Main responsibilities:
 * - Converting glossary terms into replacement specifications
 * - Maintaining consistency between source and target terms
 * - Standardizing replacement format for glossary terms
 * 
 * @since 1.0.0
 */
export class GlossaryReplacementService {
    /**
     * Creates replacement specs from glossary terms
     * @param terms List of glossary terms
     * @returns ReplacementSpecs object with each term as both target and search term
     */
    createFromGlossaryTerms(terms: Term[]): ReplacementSpecs {
        return {
            category: 'Local',
            replacements: terms.map(term => ({
                target: term.terme,
                toSearch: [term.terme]
            }))
        };
    }
}
