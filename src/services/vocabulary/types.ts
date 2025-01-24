import { doubleMetaphone } from 'double-metaphone';

export interface CorrectionDetail {
    original: string;
    corrected: string;
    position: [number, number];  // [start, end]
    matchType: 'exact' | 'phonetic';
    similarityScore: number;
    stringSimilarity: number;
    phoneticSimilarity: number;
    lengthPenalty: number;
}

export interface CorrectionResult {
    originalText: string;
    correctedText: string;
    corrections: CorrectionDetail[];
}

export interface PhoneticAlgorithm {
    encode(text: string): string;
}
