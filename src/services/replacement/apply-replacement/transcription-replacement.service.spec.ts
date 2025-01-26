import { ReplacementSpecs } from '../../../models/schemas';
import { TranscriptionReplacementService } from './transcription-replacement.service';

describe('TranscriptionReplacementService', () => {
    let service: TranscriptionReplacementService;

    beforeEach(() => {
        service = new TranscriptionReplacementService();
    });

    describe('applyReplacements', () => {
        it('should replace text according to replacement specs', () => {
            const content = 'John: Hello\nJohn: Hi\nJane: Hey';
            const specs: ReplacementSpecs = {
                category: 'Speakers',
                replacements: [
                    {
                        target: 'John Smith',
                        toSearch: ['John']
                    },
                    {
                        target: 'Jane Doe',
                        toSearch: ['Jane']
                    }
                ]
            };

            const expected = 'John Smith: Hello\nJohn Smith: Hi\nJane Doe: Hey';
            const result = service.applyReplacements(content, [specs]);
            expect(result.result).toBe(expected);
            expect(result.reports).toHaveLength(1);
            expect(result.reports[0].category).toBe('Speakers');
            expect(result.reports[0].replacements).toHaveLength(3);
        });

        it('should not replace parts of words with accented characters', () => {
            const content = 'Demain nous allons a Genève mais pas tout de suite';
            const specs: ReplacementSpecs = {
                category: 'Categ',
                replacements: [
                    {
                        target: 'V1',
                        toSearch: ['ve']
                    },
                ]
            };

            const expected = 'Demain nous allons a Genève mais pas tout de suite';
            const result = service.applyReplacements(content, [specs]);
            expect(result.result).toBe(expected);
            expect(result.reports).toHaveLength(0);
        });

        it('should not replace parts of words with unaccented characters', () => {
            const content = 'Demain nous allons a Geneve mais pas tout de suite';
            const specs: ReplacementSpecs = {
                category: 'Categ',
                replacements: [
                    {
                        target: 'V1',
                        toSearch: ['ve']
                    },
                ]
            };

            const expected = 'Demain nous allons a Geneve mais pas tout de suite';
            const result = service.applyReplacements(content, [specs]);
            expect(result.result).toBe(expected);
            expect(result.reports).toHaveLength(0);
        });

        it('should treat regex special characters as literal in search terms', () => {
            const content = 'Hello TPG how are you';
            const specs: ReplacementSpecs = {
                category: 'Speakers',
                replacements: [
                    {
                        target: 'TPG+',
                        toSearch: ['TPG+']
                    },
                ]
            };

            const expected = 'Hello TPG how are you';
            const result = service.applyReplacements(content, [specs]);
            expect(result.result).toBe(expected);
            expect(result.reports).toHaveLength(0);
        });

        it('should handle empty replacements', () => {
            const content = 'Hello World';
            const specs: ReplacementSpecs = {
                category: 'Empty',
                replacements: []
            };

            const result = service.applyReplacements(content, [specs]);
            expect(result.result).toBe(content);
            expect(result.reports).toHaveLength(0);
        });

        it('should handle multiple occurrences of the same term', () => {
            const content = 'John: Hi John, this is John speaking';
            const specs: ReplacementSpecs = {
                category: 'Speakers',
                replacements: [
                    {
                        target: 'John Smith',
                        toSearch: ['John', 'John Smith']
                    }
                ]
            };

            const expected = 'John Smith: Hi John Smith, this is John Smith speaking';
            const result = service.applyReplacements(content, [specs]);
            expect(result.result).toBe(expected);
            expect(result.reports).toHaveLength(1);
            expect(result.reports[0].replacements).toHaveLength(3);
        });

        it('should handle multiple ReplacementSpecs', () => {
            const content = 'John: Hello Bob, this is John speaking to Bob Smith';
            const speakersSpecs: ReplacementSpecs = {
                category: 'Speakers',
                replacements: [
                    {
                        target: 'John Smith',
                        toSearch: ['John', 'John Smith']
                    }
                ]
            };
            const namesSpecs: ReplacementSpecs = {
                category: 'Names',
                replacements: [
                    {
                        target: 'Robert Smith',
                        toSearch: ['Bob', 'Bob Smith']
                    }
                ]
            };

            const expected = 'John Smith: Hello Robert Smith, this is John Smith speaking to Robert Smith';
            const result = service.applyReplacements(content, [speakersSpecs, namesSpecs]);
            expect(result.result).toBe(expected);
            expect(result.reports).toHaveLength(2);
            expect(result.reports[0].category).toBe('Speakers');
            expect(result.reports[1].category).toBe('Names');
        });
    });

    // Test the private createSearchPattern method through a public method
    describe('pattern creation (via applyReplacements)', () => {
        it('should handle normal terms by taking only the part before special characters', () => {
            const content = 'nova-14 is here';
            const specs: ReplacementSpecs = {
                category: 'Test',
                replacements: [
                    {
                        target: 'NOVA',
                        toSearch: ['nova-14']
                    }
                ]
            };

            const result = service.applyReplacements(content, [specs]);
            expect(result.result).toBe('NOVA is here');
        });

        it('should handle regex patterns enclosed in slashes', () => {
            const content = 'nova14 and nova-14 and nova_14 and AFAS as well';
            const specs: ReplacementSpecs = {
                category: 'Test',
                replacements: [
                    {
                        target: 'NOVA',
                        toSearch: ['/nova.?14/']
                    },
                    {
                        target: 'Hafas',
                        toSearch: ['/afas+/']
                    }
                ]
            };

            const result = service.applyReplacements(content, [specs]);
            expect(result.result).toBe('NOVA and NOVA and NOVA and Hafas as well');
            expect(result.reports[0].replacements).toHaveLength(4);
        });

        it('should handle mixed normal terms and regex patterns', () => {
            const content = 'nova14 and nova-14 and simple-term';
            const specs: ReplacementSpecs = {
                category: 'Test',
                replacements: [
                    {
                        target: 'NOVA',
                        toSearch: ['/nova.?14/', 'simple-term']
                    }
                ]
            };

            const result = service.applyReplacements(content, [specs]);
            expect(result.result).toBe('NOVA and NOVA and NOVA');
            expect(result.reports[0].replacements).toHaveLength(3);
        });

        it('should respect word boundaries', () => {
            const content = 'supernova14 nova14 subnova14';
            const specs: ReplacementSpecs = {
                category: 'Test',
                replacements: [
                    {
                        target: 'NOVA',
                        toSearch: ['/nova.?14/']
                    }
                ]
            };

            const result = service.applyReplacements(content, [specs]);
            expect(result.result).toBe('supernova14 NOVA subnova14');
            expect(result.reports[0].replacements).toHaveLength(1);
        });
    });
});
