import { ReplacementSpecs } from '../../models/schemas';
import { Term } from '../../types/glossary';

/**
 * Service for handling glossary term replacements
 */
export class GlossaryReplacementService {
    /**
     * Creates replacement specs from glossary terms
     * @param terms List of glossary terms
     * @returns ReplacementSpecs object with each term as both target and search term
     */
    createFromGlossaryTerms(terms: Term[]): ReplacementSpecs {
        return {
            category: 'Glossary',
            replacements: terms.map(term => ({
                target: term.terme,
                toSearch: [term.terme]
            }))
        };
    }
}
