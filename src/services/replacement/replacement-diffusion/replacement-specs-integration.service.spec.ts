import { ReplacementSpec, ReplacementSpecs } from "../../../models/schemas";
import { ReplacementSpecsIntegrationService } from "./replacement-specs-integration.service";

describe('ReplacementSpecsIntegrationService', () => {
    let service: ReplacementSpecsIntegrationService;

    beforeEach(() => {
        service = new ReplacementSpecsIntegrationService();
    });

    // Fonction utilitaire pour créer facilement une ReplacementSpecs
    function createExistingSpec(category: string, ...replacements: { target: string, terms: string[] }[]): ReplacementSpecs {
        return {
            category,
            replacements: replacements.map(r => ({
                target: r.target,
                toSearch: r.terms
            }))
        };
    }

    // Fonction utilitaire pour créer facilement une ReplacementSpec
    function createSpec(target: string, terms: string[]): ReplacementSpec {
        return {
            target,
            toSearch: terms
        };
    }

    describe('determineHowToIntegrateSpecs', () => {
        it('should integrate specs with missing terms into the correct category', () => {
            // Arrange
            const existingSpecs = [
                createExistingSpec('greetings', 
                    { target: 'hello', terms: ['hi', 'hey'] }
                )
            ];

            const specsToIntegrate = [
                createSpec('hello', ['bonjour'])
            ];

            // Act
            const result = service.determineHowToIntegrateSpecs(existingSpecs, specsToIntegrate);

            // Assert
            expect(result.integrations).toHaveLength(1);
            expect(result.integrations[0].targetCategory).toBe('greetings');
            expect(result.integrations[0].specsToIntegrate).toEqual(specsToIntegrate);
            expect(result.alreadyIntegrated).toHaveLength(0);
            expect(result.analyzedFilesCount).toEqual(existingSpecs.length);
        });

        it('should mark specs as already integrated with their category', () => {
            // Arrange
            const existingSpecs = [
                createExistingSpec('greetings',
                    { target: 'hello', terms: ['hi', 'hey', 'bonjour'] }
                )
            ];

            const specsToIntegrate = [
                createSpec('hello', ['hi', 'hey'])
            ];

            // Act
            const result = service.determineHowToIntegrateSpecs(existingSpecs, specsToIntegrate);

            // Assert
            expect(result.integrations).toHaveLength(0);
            expect(result.alreadyIntegrated).toEqual([{
                spec: specsToIntegrate[0],
                category: 'greetings'
            }]);
            expect(result.analyzedFilesCount).toEqual(existingSpecs.length);
        });

        it('should throw error when terms exist in another target', () => {
            // Arrange
            const existingSpecs = [
                createExistingSpec('greetings',
                    { target: 'hello', terms: ['hi'] },
                    { target: 'goodbye', terms: ['bye'] }
                )
            ];

            const specsToIntegrate = [
                createSpec('farewell', ['bye'])
            ];

            // Act & Assert
            expect(() => service.determineHowToIntegrateSpecs(existingSpecs, specsToIntegrate))
                .toThrow(/Incohérence détectée/);
        });

        it('should mark specs that need classification', () => {
            // Arrange
            const existingSpecs = [
                createExistingSpec('greetings',
                    { target: 'hello', terms: ['hi'] }
                )
            ];

            const specsToIntegrate = [
                createSpec('merci', ['thanks'])
            ];

            // Act
            const result = service.determineHowToIntegrateSpecs(existingSpecs, specsToIntegrate);

            // Assert
            expect(result.integrations).toHaveLength(0);
            expect(result.alreadyIntegrated).toHaveLength(0);
            expect(result.needsClassification).toEqual(specsToIntegrate);
            expect(result.analyzedFilesCount).toEqual(existingSpecs.length);
        });

        it('should group multiple specs by target category', () => {
            // Arrange
            const existingSpecs = [
                createExistingSpec('greetings',
                    { target: 'hello', terms: ['hi'] }
                )
            ];

            const specsToIntegrate = [
                createSpec('hello', ['hey']),
                createSpec('hello', ['bonjour'])
            ];

            // Act
            const result = service.determineHowToIntegrateSpecs(existingSpecs, specsToIntegrate);

            // Assert
            expect(result.integrations).toHaveLength(1);
            expect(result.integrations[0].targetCategory).toBe('greetings');
            expect(result.integrations[0].specsToIntegrate).toEqual(specsToIntegrate);
            expect(result.analyzedFilesCount).toEqual(existingSpecs.length);
        });
    });

    describe('checkSpecsIntegrity', () => {
        it('should not throw error when all specs are valid', () => {
            // Arrange
            const specs = createExistingSpec('greetings',
                { target: 'hello', terms: ['hi', 'hey'] }
            );

            // Act & Assert
            expect(() => service.checkSpecsIntegrity(specs)).not.toThrow();
        });

        it('should throw error when a search term equals its target', () => {
            // Arrange
            const specs = createExistingSpec('greetings',
                { target: 'hello', terms: ['hi', 'hello', 'hey'] }
            );

            // Act & Assert
            expect(() => service.checkSpecsIntegrity(specs))
                .toThrow('Invalid replacement specs in category "greetings": Search term(s) "hello" cannot be equal to their target "hello"');
        });

        it('should throw error when multiple search terms equal their target', () => {
            // Arrange
            const specs = createExistingSpec('greetings',
                { target: 'hello', terms: ['hello', 'hi', 'hello'] }
            );

            // Act & Assert
            expect(() => service.checkSpecsIntegrity(specs))
                .toThrow('Invalid replacement specs in category "greetings": Search term(s) "hello", "hello" cannot be equal to their target "hello"');
        });
    });
});
