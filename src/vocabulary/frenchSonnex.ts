import { PhoneticAlgorithm } from './types';
import sonnex from 'talisman/phonetics/french/sonnex';

export class FrenchSonnexAlgorithm implements PhoneticAlgorithm {
    encode(text: string): string {
        return sonnex(text).replace(/ /g, '').toLowerCase();
    }
}
