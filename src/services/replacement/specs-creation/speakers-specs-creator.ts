import { ReplacementSpecs } from '../../../models/schemas';

/**
 * Creates replacement specs from a list of speakers
 * @param speakers List of speaker names
 * @returns ReplacementSpecs object with each speaker as a target
 */
export function createReplacementSpecsFromSpeakers(speakers: string[]): ReplacementSpecs {
    return {
        category: 'Speakers',
        replacements: speakers.map(speaker => ({
            target: speaker,
            toSearch: [speaker]
        }))
    };
}
