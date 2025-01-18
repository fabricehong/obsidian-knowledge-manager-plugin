import { DoubleMetaphoneAlgorithm } from './doubleMetaphone';

describe('DoubleMetaphoneAlgorithm', () => {
    const algorithm = new DoubleMetaphoneAlgorithm();

    test('encodes words correctly', () => {
        // Test cases from the double-metaphone documentation
        expect(algorithm.encode('michael')).toBe('MKL');
        expect(algorithm.encode('crevalle')).toBe('KRFL');
        expect(algorithm.encode('Filipowitz')).toBe('FLPTS');
        expect(algorithm.encode('Xavier')).toBe('SF');
        expect(algorithm.encode('delicious')).toBe('TLSS');
    });

    test('handles empty and invalid input', () => {
        expect(algorithm.encode('')).toBe('');
        expect(algorithm.encode(' ')).toBe('');
        expect(algorithm.encode('123')).toBe('');
    });
});
