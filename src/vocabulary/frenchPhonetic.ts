import { PhoneticAlgorithm } from './types';

export class FrenchPhoneticAlgorithm implements PhoneticAlgorithm {
    encode(text: string): string {
        // Convert to lowercase and normalize accents
        return text.toLowerCase()
            // Handle common French patterns
            .replace(/é|è|ê|ë/g, 'e')
            .replace(/à|â|ä/g, 'a')
            .replace(/ô|ö/g, 'o')
            .replace(/û|ù|ü/g, 'u')
            .replace(/ç/g, 's')
            // Handle special cases for TPG+
            .replace(/tépéjé/g, 'tpg')
            .replace(/plusse?/g, 'plus')
            // Clean up
            .replace(/[+]/g, ' plus')
            .replace(/\s+/g, ' ')
            .trim();
    }
}
