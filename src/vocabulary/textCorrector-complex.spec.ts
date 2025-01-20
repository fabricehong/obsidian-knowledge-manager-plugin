import { TextCorrector } from './textCorrector';
import { DoubleMetaphoneAlgorithm } from './doubleMetaphone';
import { FrenchPhoneticAlgorithm } from './frenchPhonetic';
import { FrenchSonnexAlgorithm } from './frenchSonnex';

describe('TextCorrector', () => {
    let corrector: TextCorrector;

    beforeEach(() => {
        corrector = new TextCorrector(
            new FrenchSonnexAlgorithm(),  // phoneticAlgorithm
            0.7,   // threshold
            0,   // stringWeight
            0.4,   // lengthWeight
            true   // debug enabled
        );
        
        // Set vocabulary terms
        corrector.setVocabulary(['TPG+', 'NextGen', 'Hafas']);
    });

    test('full sentence correction', () => {
        const text = "tépéjé plusse";
        const result = corrector.correctText(text);
        expect(result.correctedText).toContain('TPG+');
    });
});
