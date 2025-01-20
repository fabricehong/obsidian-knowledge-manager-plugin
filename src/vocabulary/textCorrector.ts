import { PhoneticAlgorithm, CorrectionResult, CorrectionDetail } from './types';
import { DoubleMetaphoneAlgorithm } from './doubleMetaphone';
import { ratio } from './utils';

export class TextCorrector {
    private vocabulary: string[] = [];
    private phoneticAlgorithm: PhoneticAlgorithm;
    private threshold: number = 0.7;
    private stringWeight: number;
    private lengthWeight: number;
    private debug: boolean;
    private phoneticWeight: number;
    private vocabularyPhonetic: Map<string, string>;

    constructor(
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

        this.phoneticAlgorithm = phoneticAlgorithm || new DoubleMetaphoneAlgorithm();
        this.threshold = threshold;
        this.stringWeight = stringWeight;
        this.phoneticWeight = 1 - stringWeight;
        this.lengthWeight = lengthWeight;
        this.debug = debug;

        // Pre-compute phonetic keys for vocabulary
        this.vocabularyPhonetic = new Map();
    }

    setVocabulary(terms: string[]) {
        this.vocabulary = terms;
        this.vocabularyPhonetic = new Map(
            terms.map(word => [word, this.phoneticAlgorithm.encode(this.toSpokenForm(word))])
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
                const processedIndices = [...Array(end - start)]
                    .map((_, i) => start + i)
                    .filter(i => processedPositions.has(i))
                    .map(i => `'${words[i]}'(position ${i})`);
                this.debugPrint(`Skipping n-gram '${ngram}': Containing already processed words: ${processedIndices.join(', ')}`);
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
                    similarityScore: similarity,
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

    private findBestMatch(text: string): [string | null, number, { matchType: 'exact' | 'phonetic', stringSimilarity: number, phoneticSimilarity: number, lengthPenalty: number }] {
        if (!text || text.length < 2) {
            return [null, 0, { matchType: 'exact', stringSimilarity: 0, phoneticSimilarity: 0, lengthPenalty: 0 }];
        }

        const textKey = this.phoneticAlgorithm.encode(this.toSpokenForm(text)) || '';
        let bestMatch: string | null = null;
        let bestScore = -Infinity;
        let matchDetails: { matchType: 'exact' | 'phonetic', stringSimilarity: number, phoneticSimilarity: number, lengthPenalty: number } = { matchType: 'exact', stringSimilarity: 0, phoneticSimilarity: 0, lengthPenalty: 0 };
        let bestDebugInfo: string[] = [];

        this.debugPrint(`\nTrying to match text: '${text}'`);
        this.debugPrint(`Text phonetic key: ${textKey}`);

        // Check for exact matches first (case-insensitive)
        const exactMatch = this.vocabulary.find(word => word.toLowerCase() === text.toLowerCase());
        if (exactMatch) {
            this.debugPrint('Found exact match (case-insensitive)');
            return [exactMatch, 1.0, { matchType: 'exact', stringSimilarity: 1.0, phoneticSimilarity: 1.0, lengthPenalty: 1.0 }];
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

            // Store debug info
            const currentDebugInfo = [
                `\nComparing with '${ref}':`,
                `  - String similarity: ${stringSimilarity.toFixed(3)} (strings: ${text} vs ${ref})`,
                `  - Phonetic similarity: ${phoneticSimilarity.toFixed(3)} (keys: ${textKey} vs ${refKey})`,
                `  - Combined score without penalty: ${combinedScoreNoPenalty.toFixed(3)}`,
                `  - Length penalty: ${lengthPenalty.toFixed(3)}`,
                `  - Final score: ${combinedScore.toFixed(3)} (threshold: ${this.threshold})`
            ];

            if (combinedScore >= this.threshold && combinedScore > bestScore) {
                bestMatch = ref;
                bestScore = combinedScore;
                matchDetails = {
                    matchType: 'phonetic',
                    stringSimilarity,
                    phoneticSimilarity,
                    lengthPenalty
                };
                bestDebugInfo = [...currentDebugInfo, `  -> New best match! Score: ${bestScore.toFixed(3)}`];
            }
        }

        // Print debug info at the end
        if (bestMatch) {
            bestDebugInfo.forEach(line => this.debugPrint(line));
        } else {
            this.debugPrint('No match found');
        }

        return bestMatch ? [bestMatch, bestScore, matchDetails] : [null, 0, { matchType: 'exact', stringSimilarity: 0, phoneticSimilarity: 0, lengthPenalty: 0 }];
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
