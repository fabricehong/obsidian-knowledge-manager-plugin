import { ReplacementReport, ReplacementStatistics, ReplacementCount } from "../../models/interfaces";
import { convertToReplacementStatistics } from "./replacement-statistics.service";

describe('convertToReplacementStatistics', () => {
    it('should convert empty reports to empty statistics', () => {
        const result = convertToReplacementStatistics([]);
        expect(result).toEqual([]);
    });

    it('should aggregate replacements by category and count occurrences', () => {
        const reports: ReplacementReport[] = [
            {
                category: 'Speakers',
                replacements: [
                    { toSearch: 'A', target: 'B' },
                    { toSearch: 'A', target: 'B' },  // même remplacement
                    { toSearch: 'A', target: 'C' },  // même terme source, cible différente
                ]
            },
            {
                category: 'Speakers',  // même catégorie
                replacements: [
                    { toSearch: 'A', target: 'B' },  // remplacement déjà vu
                    { toSearch: 'D', target: 'E' },  // nouveau remplacement
                ]
            },
            {
                category: 'Other',     // nouvelle catégorie
                replacements: [
                    { toSearch: 'X', target: 'Y' },
                ]
            }
        ];

        const result = convertToReplacementStatistics(reports);

        // Vérifie la structure globale
        expect(result).toHaveLength(2);  // 2 catégories : 'Speakers' et 'Other'

        // Vérifie la catégorie 'Speakers'
        const speakersStats = result.find((s: ReplacementStatistics) => s.category === 'Speakers');
        expect(speakersStats).toBeDefined();
        expect(speakersStats?.replacements).toHaveLength(3);  // A→B, A→C, D→E

        // Vérifie les compteurs spécifiques
        const aToB = speakersStats?.replacements.find((r: ReplacementCount) => r.from === 'A' && r.to === 'B');
        expect(aToB?.count).toBe(3);  // A→B apparaît 3 fois

        const aToC = speakersStats?.replacements.find((r: ReplacementCount) => r.from === 'A' && r.to === 'C');
        expect(aToC?.count).toBe(1);  // A→C apparaît 1 fois

        const dToE = speakersStats?.replacements.find((r: ReplacementCount) => r.from === 'D' && r.to === 'E');
        expect(dToE?.count).toBe(1);  // D→E apparaît 1 fois

        // Vérifie la catégorie 'Other'
        const otherStats = result.find((s: ReplacementStatistics) => s.category === 'Other');
        expect(otherStats).toBeDefined();
        expect(otherStats?.replacements).toHaveLength(1);
        expect(otherStats?.replacements[0]).toEqual({
            from: 'X',
            to: 'Y',
            count: 1
        });
    });

    it('should handle undefined or empty replacements gracefully', () => {
        const reports: ReplacementReport[] = [
            {
                category: 'Test',
                replacements: []
            },
            {
                category: 'Test',
                replacements: [
                    { toSearch: 'A', target: 'B' }
                ]
            }
        ];

        const result = convertToReplacementStatistics(reports);
        expect(result).toHaveLength(1);
        expect(result[0].replacements).toHaveLength(1);
        expect(result[0].replacements[0]).toEqual({
            from: 'A',
            to: 'B',
            count: 1
        });
    });
});
