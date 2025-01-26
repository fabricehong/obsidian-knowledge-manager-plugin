import { ReplacementSpec, ReplacementSpecs } from "../../../models/schemas";
import { ReplacementSpecsIntegrationEvaluator } from "./replacement-specs-integration-evaluator";

export interface ReplacementSpecsIntegrationSummary {
    integrations: {
        targetCategory: string,
        specsToIntegrate: ReplacementSpec[]
    }[];
    alreadyIntegrated: {
        spec: ReplacementSpec;
        category: string;
    }[];
    needsClassification: ReplacementSpec[];
    analyzedFilesCount: number;
}

interface IntegrationTarget {
    shouldIntegrate: boolean;
    isComplete: boolean;
    category?: string;
    specToIntegrate?: ReplacementSpec;
}

export class ReplacementSpecsIntegrationService {
    constructor() {}

    private findIntegrationTarget(
        existingSpecs: ReplacementSpecs[],
        specToIntegrate: ReplacementSpec
    ): IntegrationTarget {
        for (const specs of existingSpecs) {
            const evaluator = new ReplacementSpecsIntegrationEvaluator(specs);
            const result = evaluator.evaluateIntegration(specToIntegrate);

            switch (result.status) {
                case 'MISSING_TERMS':
                    return {
                        shouldIntegrate: true,
                        isComplete: false,
                        category: specs.category,
                        specToIntegrate: {
                            target: result.specToIntegrate.target,
                            toSearch: result.specToIntegrate.toSearch
                        }
                    };
                case 'ALREADY_COMPLETE':
                    return {
                        shouldIntegrate: false,
                        isComplete: true,
                        category: specs.category
                    };
                case 'TERMS_EXIST_ELSEWHERE':
                    throw new Error(
                        `Incohérence détectée : Les termes de recherche existent dans une autre cible. ` +
                        `Spec à intégrer : ${JSON.stringify(specToIntegrate)}. ` +
                        `Category : ${result.category}. ` +
                        `Target existant : ${result.existingTarget}`
                    );
                case 'NO_MATCH':
                    continue;
            }
        }

        return {
            shouldIntegrate: false,
            isComplete: false
        };
    }

    /**
     * Analyse les specs à intégrer et détermine comment les intégrer dans les specs existantes.
     * 
     * Pour chaque spec à intégrer, la méthode :
     * 1. Cherche une catégorie existante appropriée via findIntegrationTarget
     * 2. Classe la spec dans l'une des trois catégories :
     *    - integrations : specs qui peuvent être intégrées dans une catégorie existante
     *    - alreadyIntegrated : specs qui sont déjà présentes dans une catégorie
     *    - needsClassification : specs qui nécessitent une classification manuelle
     * 
     * @param existingSpecs - Les specs existantes dans le vault, organisées par catégorie
     * @param specsToIntegrate - Les nouvelles specs à intégrer
     * @returns Un objet ReplacementSpecsIntegrationSummary contenant :
     *          - integrations : les specs qui peuvent être intégrées, groupées par catégorie cible
     *          - alreadyIntegrated : les specs qui sont déjà présentes, avec leur catégorie
     *          - needsClassification : les specs qui nécessitent une classification manuelle
     *          - analyzedFilesCount : le nombre de fichiers analysés
     * 
     * @example
     * // Exemple de retour pour une spec "chat" à intégrer :
     * {
     *   integrations: [{
     *     targetCategory: "animaux",
     *     specsToIntegrate: [{ target: "chat", toSearch: ["minou", "matou"] }]
     *   }],
     *   alreadyIntegrated: [],
     *   needsClassification: [],
     *   analyzedFilesCount: 1
     * }
     */
    public determineHowToIntegrateSpecs(
        existingSpecs: { category: string; replacements: ReplacementSpec[] }[],
        specsToIntegrate: ReplacementSpec[]
    ): ReplacementSpecsIntegrationSummary {
        const result: ReplacementSpecsIntegrationSummary = {
            integrations: [],
            alreadyIntegrated: [],
            needsClassification: [],
            analyzedFilesCount: existingSpecs.length
        };

        // Pour chaque spec à intégrer
        for (const specToIntegrate of specsToIntegrate) {
            const integrationResult = this.findIntegrationTarget(existingSpecs, specToIntegrate);
            
            if (integrationResult.shouldIntegrate) {
                // Ajouter à la liste des intégrations
                const existingIntegration = result.integrations.find(i => 
                    i.targetCategory === integrationResult.category
                );
                
                if (existingIntegration) {
                    existingIntegration.specsToIntegrate.push(integrationResult.specToIntegrate!);
                } else {
                    result.integrations.push({
                        targetCategory: integrationResult.category!,
                        specsToIntegrate: [integrationResult.specToIntegrate!]
                    });
                }
            } else if (integrationResult.isComplete) {
                // Déjà intégré
                result.alreadyIntegrated.push({
                    spec: specToIntegrate,
                    category: integrationResult.category!
                });
            } else {
                // Nécessite une classification manuelle
                result.needsClassification.push(specToIntegrate);
            }
        }

        return result;
    }

    public checkSpecsIntegrity(specs: ReplacementSpecs) {
        for (const replacement of specs.replacements) {
            const invalidTerms = replacement.toSearch.filter(term => term === replacement.target);
            if (invalidTerms.length > 0) {
                throw new Error(
                    `Invalid replacement specs in category "${specs.category}": ` +
                    `Search term(s) "${invalidTerms.join('", "')}" cannot be equal to their target "${replacement.target}"`
                );
            }
        }
    }

    public integrateReplacementSpecs(
        existingSpecs: ReplacementSpecs,
        specsToIntegrate: ReplacementSpec[]
    ) {
        const specsWrapper = new ReplacementSpecsIntegrationEvaluator(existingSpecs);
        for (const spec of specsToIntegrate) {
            specsWrapper.integrate(spec);
        }
    }
}
