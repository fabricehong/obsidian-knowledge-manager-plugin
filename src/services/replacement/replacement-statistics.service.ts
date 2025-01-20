import { ReplacementReport, ReplacementStatistics, ReplacementCount } from "../../models/interfaces";

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
