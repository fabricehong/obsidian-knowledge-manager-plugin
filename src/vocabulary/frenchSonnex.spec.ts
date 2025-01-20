import { FrenchPhonexAlgorithm } from './frenchPhonex';
import { FrenchSonnexAlgorithm } from './frenchSonnex';

describe('FrenchSonnexAlgorithm', () => {
    let algorithm: FrenchSonnexAlgorithm;

    beforeEach(() => {
        algorithm = new FrenchSonnexAlgorithm();
    });

    function assertSamePhoneticCode(words: string[]) {
        if (words.length < 2) {
            throw new Error('Need at least 2 words to compare phonetic codes');
        }

        const codes = words.map(word => algorithm.encode(word));
        const firstCode = codes[0];
        
        words.forEach((word, index) => {
            expect(codes[index]).toBe(firstCode);
        });
    }

    test('haut', () => {
        assertSamePhoneticCode(['au', 'eau', 'haut']);
    });

    test('fer', () => {
        assertSamePhoneticCode(['fair', 'fer']);
    });

    test('plus', () => {
        assertSamePhoneticCode(['tpg+', 'tpg plus']);
    });
});
