import { ReplacementReport, ReplacementStatistics, ReplacementCount } from "../../../models/interfaces";

/**
 * Utility service responsible for converting replacement reports into statistical summaries.
 * This function aggregates and transforms raw replacement reports into structured statistics,
 * grouping them by category and counting occurrences of each replacement pattern.
 * 
 * Main responsibilities:
 * - Aggregating replacement reports by category
 * - Counting occurrences of each replacement pattern
 * - Converting raw data into structured statistics
 * - Maintaining unique replacement patterns within categories
 * 
 * @param reports Array of replacement reports to be processed
 * @returns Array of replacement statistics grouped by category
 * @since 1.0.0
 */
export function convertToReplacementStatistics(reports: ReplacementReport[]): ReplacementStatistics[] {
    const categoryMap = new Map<string, Map<string, ReplacementCount>>();

    for (const report of reports) {
        if (!categoryMap.has(report.category)) {
            categoryMap.set(report.category, new Map<string, ReplacementCount>());
        }

        const replacementMap = categoryMap.get(report.category)!;
        for (const replacement of report.replacements) {
            const key = `${replacement.toSearch}|${replacement.target}`;
            if (!replacementMap.has(key)) {
                replacementMap.set(key, {
                    from: replacement.toSearch,
                    to: replacement.target,
                    count: 0
                });
            }
            replacementMap.get(key)!.count++;
        }
    }

    return Array.from(categoryMap.entries()).map(([category, replacementMap]) => ({
        category,
        replacements: Array.from(replacementMap.values())
    }));
}
