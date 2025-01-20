import { PhoneticAlgorithm } from './types';
import phonex from 'talisman/phonetics/french/phonex';

export class FrenchPhonexAlgorithm implements PhoneticAlgorithm {
    encode(text: string): string {
        return phonex(text).replace(/ /g, '').toLowerCase();
    }
}
