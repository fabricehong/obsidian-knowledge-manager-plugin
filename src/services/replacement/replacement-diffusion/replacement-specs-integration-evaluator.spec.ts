import { ReplacementSpec, ReplacementSpecs } from "../../../models/schemas";
import { ReplacementSpecsIntegrationEvaluator } from "./replacement-specs-integration-evaluator";

describe('ReplacementSpecsIntegrationEvaluator', () => {
    describe('evaluateIntegration', () => {
        it('should return MISSING_TERMS when some terms are missing for the same target', () => {
            // Arrange
            const existingSpecs: ReplacementSpecs = {
                category: 'greetings',
                replacements: [{
                    target: 'hello',
                    toSearch: ['hi', 'hey']
                }]
            };

            const evaluator = new ReplacementSpecsIntegrationEvaluator(existingSpecs);
            const spec: ReplacementSpec = {
                target: 'hello',
                toSearch: ['hi', 'bonjour']
            };

            const expectedSpec: ReplacementSpec = {
                target: 'hello',
                toSearch: ['bonjour']
            };

            // Act
            const result = evaluator.evaluateIntegration(spec);

            // Assert
            expect(result.status).toBe('MISSING_TERMS');
            if (result.status === 'MISSING_TERMS') {
                expect(result.category).toBe('greetings');
                expect(result.specToIntegrate).toEqual(expectedSpec);
            }
        });

        it('should return ALREADY_COMPLETE when all terms exist for the target', () => {
            // Arrange
            const existingSpecs: ReplacementSpecs = {
                category: 'greetings',
                replacements: [{
                    target: 'hello',
                    toSearch: ['hi', 'hey', 'bonjour']
                }]
            };

            const evaluator = new ReplacementSpecsIntegrationEvaluator(existingSpecs);
            const spec: ReplacementSpec = {
                target: 'hello',
                toSearch: ['hi', 'hey']
            };

            // Act
            const result = evaluator.evaluateIntegration(spec);

            // Assert
            expect(result.status).toBe('ALREADY_COMPLETE');
            if (result.status === 'ALREADY_COMPLETE') {
                expect(result.category).toBe('greetings');
            }
        });

        it('should return TERMS_EXIST_ELSEWHERE when terms exist in another target', () => {
            // Arrange
            const existingSpecs: ReplacementSpecs = {
                category: 'greetings',
                replacements: [{
                    target: 'hello',
                    toSearch: ['hi']
                }, {
                    target: 'goodbye',
                    toSearch: ['bye']
                }]
            };

            const evaluator = new ReplacementSpecsIntegrationEvaluator(existingSpecs);
            const spec: ReplacementSpec = {
                target: 'farewell',
                toSearch: ['bye']
            };

            // Act
            const result = evaluator.evaluateIntegration(spec);

            // Assert
            expect(result.status).toBe('TERMS_EXIST_ELSEWHERE');
            if (result.status === 'TERMS_EXIST_ELSEWHERE') {
                expect(result.category).toBe('greetings');
                expect(result.existingTarget).toBe('goodbye');
            }
        });

        it('should return NO_MATCH when neither target nor terms exist', () => {
            // Arrange
            const existingSpecs: ReplacementSpecs = {
                category: 'greetings',
                replacements: [{
                    target: 'hello',
                    toSearch: ['hi']
                }]
            };

            const evaluator = new ReplacementSpecsIntegrationEvaluator(existingSpecs);
            const spec: ReplacementSpec = {
                target: 'merci',
                toSearch: ['thanks']
            };

            // Act
            const result = evaluator.evaluateIntegration(spec);

            // Assert
            expect(result.status).toBe('NO_MATCH');
        });
    });

    describe('integrate', () => {
        it('should add new search terms to existing target', () => {
            // Arrange
            const specs: ReplacementSpecs = {
                category: 'test',
                replacements: [
                    { target: 'hello', toSearch: ['hi'] }
                ]
            };
            const evaluator = new ReplacementSpecsIntegrationEvaluator(specs);
            
            // Act
            evaluator.integrate({ target: 'hello', toSearch: ['hey', 'bonjour'] });
            
            // Assert
            expect(specs.replacements).toHaveLength(1);
            expect(specs.replacements[0]).toEqual({
                target: 'hello',
                toSearch: ['hi', 'hey', 'bonjour']
            });
        });

        it('should add new replacement when target does not exist', () => {
            // Arrange
            const specs: ReplacementSpecs = {
                category: 'test',
                replacements: [
                    { target: 'hello', toSearch: ['hi'] }
                ]
            };
            const evaluator = new ReplacementSpecsIntegrationEvaluator(specs);
            
            // Act
            evaluator.integrate({ target: 'goodbye', toSearch: ['bye', 'ciao'] });
            
            // Assert
            expect(specs.replacements).toHaveLength(2);
            expect(specs.replacements[1]).toEqual({
                target: 'goodbye',
                toSearch: ['bye', 'ciao']
            });
        });
    });
});
