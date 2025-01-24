import { doubleMetaphone } from 'double-metaphone';
import { PhoneticAlgorithm } from './types';

export class DoubleMetaphoneAlgorithm implements PhoneticAlgorithm {
    encode(text: string): string {
        // doubleMetaphone returns [primary, secondary]
        // we'll use primary like in Python
        const [primary] = doubleMetaphone(text);
        return primary;
    }
}
