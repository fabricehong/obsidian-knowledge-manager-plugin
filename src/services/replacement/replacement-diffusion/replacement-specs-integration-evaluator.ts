import { ReplacementSpec, ReplacementSpecs } from "../../../models/schemas";

interface MissingTermsResult {
    status: 'MISSING_TERMS';
    category: string;
    specToIntegrate: ReplacementSpec;
}

interface AlreadyCompleteResult {
    status: 'ALREADY_COMPLETE';
    category: string;
}

interface TermsExistElsewhereResult {
    status: 'TERMS_EXIST_ELSEWHERE';
    category: string;
    existingTarget: string;
}

interface NoMatchResult {
    status: 'NO_MATCH';
}

export type ReplacementSpecIntegrationResult = 
    | MissingTermsResult
    | AlreadyCompleteResult
    | TermsExistElsewhereResult
    | NoMatchResult;

export class ReplacementSpecsIntegrationEvaluator {
    
    constructor(public readonly replacementSpecs: ReplacementSpecs) {}
    
    /** 
     * Evaluates if and how a ReplacementSpec can be integrated into existing specs.
     * The result indicates:
     * - If terms are missing for the same target (MISSING_TERMS)
     * - If all terms already exist for the target (ALREADY_COMPLETE)
     * - If terms exist in another target (TERMS_EXIST_ELSEWHERE)
     * - If neither target nor terms exist (NO_MATCH)
     * 
     * @param spec The ReplacementSpec to evaluate for integration
     * @returns A ReplacementSpecIntegrationResult with detailed status and relevant data
     */
    public evaluateIntegration(spec: ReplacementSpec): ReplacementSpecIntegrationResult {
        // Find if target exists
        const existingReplacement = this.replacementSpecs.replacements
            .find(r => r.target === spec.target);
        
        if (existingReplacement) {
            // Same target case: check for missing terms
            const missingSearchTerms = spec.toSearch.filter(term => 
                !existingReplacement.toSearch.includes(term)
            );
            
            if (missingSearchTerms.length === 0) {
                return {
                    status: 'ALREADY_COMPLETE',
                    category: this.replacementSpecs.category
                };
            }
            
            return {
                status: 'MISSING_TERMS',
                category: this.replacementSpecs.category,
                specToIntegrate: {
                    target: spec.target,
                    toSearch: missingSearchTerms
                }
            };
        }

        // Different target case: check if terms exist in other targets
        const replacementWithExistingTerm = this.replacementSpecs.replacements.find(replacement => 
            spec.toSearch.some(term => replacement.toSearch.includes(term))
        );

        if (replacementWithExistingTerm) {
            return {
                status: 'TERMS_EXIST_ELSEWHERE',
                category: this.replacementSpecs.category,
                existingTarget: replacementWithExistingTerm.target
            };
        }

        return {
            status: 'NO_MATCH'
        };
    }

    integrate(spec: ReplacementSpec) {
        // Try to find existing replacement with same target
        const existingReplacement = this.replacementSpecs.replacements.find(
            r => r.target === spec.target
        );

        if (existingReplacement) {
            // Add new search terms to existing replacement
            existingReplacement.toSearch.push(...spec.toSearch);
        } else {
            // Add new replacement at the end
            this.replacementSpecs.replacements.push({
                target: spec.target,
                toSearch: [...spec.toSearch]
            });
        }
    }
}
