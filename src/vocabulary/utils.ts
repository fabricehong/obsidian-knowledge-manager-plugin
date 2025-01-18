import { distance } from 'fastest-levenshtein';

/**
 * Calculate similarity ratio between two strings using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function ratio(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;
    return 1.0 - (distance(str1, str2) / maxLength);
}
