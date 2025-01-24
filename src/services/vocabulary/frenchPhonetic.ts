import { PhoneticAlgorithm } from './types';
import phonetic from 'talisman/phonetics/french/phonetic';

export class FrenchPhoneticAlgorithm implements PhoneticAlgorithm {
    encode(text: string): string {
        return phonetic(text);
    }
}
