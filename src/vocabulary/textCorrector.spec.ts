import { TextCorrector } from './textCorrector';
import { DoubleMetaphoneAlgorithm } from './doubleMetaphone';

describe('TextCorrector', () => {

    const corrector = new TextCorrector(
        ['NextGen', 'Hafas', 'TPG+'],  // vocabulary
        new DoubleMetaphoneAlgorithm(),  // Use Double Metaphone algorithm
        0.7,   // threshold
        0,     // string weight (100% phonetic)
        1,     // full length penalty like in Python test
        true   // debug enabled
    );

    test('simple correction', () => {

        const text = "tépéjé plusse";
        const result = corrector.correctText(text);
        expect(result.correctedText).toContain('TPG+');
    });

    test('complex correction', () => {
        const text = "next jen and hafas tépéjé plusse";
        const result = corrector.correctText(text);
        expect(result.correctedText).toContain('NextGen and Hafas TPG+');
    });
});
