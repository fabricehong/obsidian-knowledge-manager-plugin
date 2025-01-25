import { ReplacementSpecs } from '../../../models/schemas';
import { createReplacementSpecsFromSpeakers } from './speakers-specs-creator';

describe('createReplacementSpecsFromSpeakers', () => {
    it('should create replacement specs from speakers', () => {
        const speakers = ['John', 'Jane'];
        const expected: ReplacementSpecs = {
            category: 'Speakers',
            replacements: [
                {
                    target: 'John',
                    toSearch: ['John']
                },
                {
                    target: 'Jane',
                    toSearch: ['Jane']
                }
            ]
        };
        expect(createReplacementSpecsFromSpeakers(speakers)).toEqual(expected);
    });

    it('should handle empty speakers list', () => {
        const expected: ReplacementSpecs = {
            category: 'Speakers',
            replacements: []
        };
        expect(createReplacementSpecsFromSpeakers([])).toEqual(expected);
    });
});
