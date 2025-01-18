import { PhoneticAlgorithm, CorrectionResult, CorrectionDetail } from './types';
import { DoubleMetaphoneAlgorithm } from './doubleMetaphone';
import { ratio } from './utils';

export class TextCorrector {
    private vocabulary: string[];
    private phoneticAlgorithm: PhoneticAlgorithm;
    private threshold: number;
    private stringWeight: number;
    private lengthWeight: number;
    private debug: boolean;
    private phoneticWeight: number;
    private vocabularyPhonetic: Map<string, string>;

    constructor(
        vocabulary: string[],
        phoneticAlgorithm: PhoneticAlgorithm | null = null,
        threshold: number = 0.7,
        stringWeight: number = 0.6,
        lengthWeight: number = 1.0,
        debug: boolean = false
    ) {
        if (!(stringWeight >= 0 && stringWeight <= 1)) {
            throw new Error("stringWeight must be between 0 and 1");
        }
        if (!(lengthWeight >= 0 && lengthWeight <= 1)) {
            throw new Error("lengthWeight must be between 0 and 1");
        }

        this.vocabulary = vocabulary;
        this.phoneticAlgorithm = phoneticAlgorithm || new DoubleMetaphoneAlgorithm();
        this.threshold = threshold;
        this.stringWeight = stringWeight;
        this.phoneticWeight = 1 - stringWeight;
        this.lengthWeight = lengthWeight;
        this.debug = debug;

        // Pre-compute phonetic keys for vocabulary
        this.vocabularyPhonetic = new Map(
            vocabulary.map(word => [word, this.phoneticAlgorithm.encode(this.toSpokenForm(word))])
        );
    }

    correctText(text: string): CorrectionResult {
        if (!text) {
            return { originalText: text, correctedText: text, corrections: [] };
        }

        // Split text into words
        const words = text.split(/\s+/);
        this.debugPrint(`Input text split into words: ${words}`);

        // Generate n-grams of different sizes (1, 2, 3 words)
        const ngrams: [number, number, string][] = [];
        for (let n = 3; n >= 1; n--) {
            for (let i = 0; i <= words.length - n; i++) {
                ngrams.push([i, i + n, words.slice(i, i + n).join(' ')]);
            }
        }
        this.debugPrint(`Generated n-grams: ${ngrams.map(ng => ng[2])}`);

        const correctedText = [...words];
        const processedPositions = new Set<number>();
        const corrections: CorrectionDetail[] = [];

        for (const [start, end, ngram] of ngrams) {
            // Skip if positions in this n-gram have already been processed
            if ([...Array(end - start)].some((_, i) => processedPositions.has(start + i))) {
                continue;
            }

            const [bestMatch, similarity, matchDetails] = this.findBestMatch(ngram);

            if (bestMatch && similarity >= this.threshold) {
                // Replace n-gram words with the match
                correctedText.splice(start, end - start, bestMatch, ...Array(end - start - 1).fill(''));
                for (let i = start; i < end; i++) {
                    processedPositions.add(i);
                }
                corrections.push({
                    original: ngram,
                    corrected: bestMatch,
                    position: [start, end],
                    ...matchDetails
                });
            }
        }

        const result = correctedText.filter(word => word).join(' ');
        return {
            originalText: text,
            correctedText: result,
            corrections
        };
    }

    private findBestMatch(text: string): [string | null, number, any] {
        if (!text || text.length < 2) {
            return [null, 0, null];
        }

        const textKey = this.phoneticAlgorithm.encode(this.toSpokenForm(text)) || '';
        let bestMatch: string | null = null;
        let bestScore = -Infinity;
        let matchDetails: any = null;

        this.debugPrint(`\nTrying to match text: '${text}'`);
        this.debugPrint(`Text phonetic key: ${textKey}`);

        // Check for exact matches first (case-insensitive)
        const exactMatch = this.vocabulary.find(word => word.toLowerCase() === text.toLowerCase());
        if (exactMatch) {
            this.debugPrint('Found exact match (case-insensitive)');
            return [exactMatch, 1.0, {
                matchType: 'exact',
                similarityScore: 1.0,
                stringSimilarity: 1.0,
                phoneticSimilarity: 1.0,
                lengthPenalty: 1.0
            }];
        }

        for (const ref of this.vocabulary) {
            const refKey = this.vocabularyPhonetic.get(ref) || '';

            // Calculate string similarity
            const stringSimilarity = ratio(text.toLowerCase(), ref.toLowerCase());

            // Calculate phonetic similarity
            const phoneticSimilarity = textKey && refKey ? ratio(textKey, refKey) : 0;

            // Calculate combined score without length penalty
            const combinedScoreNoPenalty = 
                (stringSimilarity * this.stringWeight) + 
                (phoneticSimilarity * this.phoneticWeight);

            // Calculate length penalty
            let lengthPenalty = 1.0;
            if (this.lengthWeight > 0 && textKey && refKey) {
                const lengthRatio = Math.min(textKey.length, refKey.length) / 
                                  Math.max(textKey.length, refKey.length);
                lengthPenalty = (1 - this.lengthWeight) + (lengthRatio * this.lengthWeight);
            }

            // Apply length penalty
            const combinedScore = combinedScoreNoPenalty * lengthPenalty;

            this.debugPrint(`\nComparing with '${ref}':`);
            this.debugPrint(`  - String similarity: ${stringSimilarity.toFixed(3)} (strings: ${text} vs ${ref})`);
            this.debugPrint(`  - Phonetic similarity: ${phoneticSimilarity.toFixed(3)} (keys: ${textKey} vs ${refKey})`);
            this.debugPrint(`  - Combined score without penalty: ${combinedScoreNoPenalty.toFixed(3)}`);
            this.debugPrint(`  - Length penalty: ${lengthPenalty.toFixed(3)}`);
            this.debugPrint(`  - Final score: ${combinedScore.toFixed(3)} (threshold: ${this.threshold})`);

            if (combinedScore >= this.threshold && combinedScore > bestScore) {
                bestMatch = ref;
                bestScore = combinedScore;
                matchDetails = {
                    matchType: 'phonetic',
                    similarityScore: combinedScore,
                    stringSimilarity,
                    phoneticSimilarity,
                    lengthPenalty
                };
                this.debugPrint(`  -> New best match! Score: ${bestScore.toFixed(3)}`);
            }
        }

        return bestMatch ? [bestMatch, bestScore, matchDetails] : [null, 0, null];
    }

    private toSpokenForm(text: string): string {
        // Simple implementation - can be enhanced for specific cases
        return text.toLowerCase()
            .replace(/[+]/g, ' plus')
            .replace(/[0-9]/g, ' ')
            .trim();
    }

    private debugPrint(...args: any[]): void {
        if (this.debug) {
            console.log(...args);
        }
    }
}
