import { TranscriptionReplacementService } from '../transcription-replacement.service';
import { ReplacementSpecs } from '../../models/interfaces';

describe('TranscriptionReplacementService', () => {
    let service: TranscriptionReplacementService;

    beforeEach(() => {
        service = new TranscriptionReplacementService();
    });

    describe('toYaml', () => {
        it('should convert ReplacementSpecs to YAML format', () => {
            const specs: ReplacementSpecs = {
                category: 'Speakers',
                replacements: [
                    {
                        target: 'John Smith',
                        toSearch: ['John Smith', 'John']
                    },
                    {
                        target: 'Jane Doe',
                        toSearch: ['Jane Doe', 'Jane']
                    }
                ]
            };

            const expected = `Speakers:
  replacements:
    - target: John Smith
      toSearch:
        - John Smith
        - John
    - target: Jane Doe
      toSearch:
        - Jane Doe
        - Jane
`;
            expect(service.toYaml(specs)).toBe(expected);
        });
    });

    describe('fromYaml', () => {
        it('should parse YAML into ReplacementSpecs', () => {
            const yamlContent = `Speakers:
  replacements:
    - target: John Smith
      toSearch:
        - John Smith
        - John
    - target: Jane Doe
      toSearch:
        - Jane Doe
        - Jane`;

            const expected: ReplacementSpecs = {
                category: 'Speakers',
                replacements: [
                    {
                        target: 'John Smith',
                        toSearch: ['John Smith', 'John']
                    },
                    {
                        target: 'Jane Doe',
                        toSearch: ['Jane Doe', 'Jane']
                    }
                ]
            };

            expect(service.fromYaml(yamlContent)).toEqual(expected);
        });
    });

    describe('toYamlBlock', () => {
        it('should wrap YAML content in a code block', () => {
            const input = 'Speakers:\n  replacements:\n    - target: John Smith\n      toSearch:\n        - John Smith';
            const expected = '```yaml\nSpeakers:\n  replacements:\n    - target: John Smith\n      toSearch:\n        - John Smith\n```';
            expect(service.toYamlBlock(input)).toBe(expected);
        });

        it('should trim extra whitespace', () => {
            const input = '\nSpeakers:\n  replacements: []\n\n';
            const expected = '```yaml\nSpeakers:\n  replacements: []\n```';
            expect(service.toYamlBlock(input)).toBe(expected);
        });
    });

    describe('fromYamlBlock', () => {
        it('should extract YAML content from a code block', () => {
            const input = '```yaml\nSpeakers:\n  replacements:\n    - target: John Smith\n      toSearch:\n        - John Smith\n```';
            const expected = 'Speakers:\n  replacements:\n    - target: John Smith\n      toSearch:\n        - John Smith';
            expect(service.fromYamlBlock(input)).toBe(expected);
        });

        it('should return original content if no code block is found', () => {
            const input = 'Speakers:\n  replacements:\n    - target: John Smith';
            expect(service.fromYamlBlock(input)).toBe(input);
        });

        it('should handle multiline YAML content', () => {
            const input = '```yaml\nSpeakers:\n  replacements:\n    - target: John Smith\n      toSearch:\n        - John Smith\n        - John\n    - target: Jane Doe\n      toSearch:\n        - Jane Doe\n```';
            const expected = 'Speakers:\n  replacements:\n    - target: John Smith\n      toSearch:\n        - John Smith\n        - John\n    - target: Jane Doe\n      toSearch:\n        - Jane Doe';
            expect(service.fromYamlBlock(input)).toBe(expected);
        });
    });

    describe('createFromSpeakers', () => {
        it('should create ReplacementSpecs from speaker list', () => {
            const speakers = ['John Smith', 'Jane Doe'];
            const expected: ReplacementSpecs = {
                category: 'Speakers',
                replacements: [
                    {
                        target: 'John Smith',
                        toSearch: ['John Smith']
                    },
                    {
                        target: 'Jane Doe',
                        toSearch: ['Jane Doe']
                    }
                ]
            };

            expect(service.createFromSpeakers(speakers)).toEqual(expected);
        });

        it('should handle empty speaker list', () => {
            const expected: ReplacementSpecs = {
                category: 'Speakers',
                replacements: []
            };

            expect(service.createFromSpeakers([])).toEqual(expected);
        });
    });

    describe('applyReplacements', () => {
        it('should replace text according to replacement specs', () => {
            const content = 'John: Hello\nJohn Smith: Hi\nJane: Hey';
            const specs: ReplacementSpecs = {
                category: 'Speakers',
                replacements: [
                    {
                        target: 'John Smith',
                        toSearch: ['John Smith', 'John']
                    },
                    {
                        target: 'Jane Doe',
                        toSearch: ['Jane']
                    }
                ]
            };

            const expected = 'John Smith: Hello\nJohn Smith: Hi\nJane Doe: Hey';
            expect(service.applyReplacements(content, specs)).toBe(expected);
        });

        it('should handle empty replacements', () => {
            const content = 'Hello World';
            const specs: ReplacementSpecs = {
                category: 'Speakers',
                replacements: []
            };

            expect(service.applyReplacements(content, specs)).toBe(content);
        });

        it('should handle multiple occurrences of the same term', () => {
            const content = 'John: Hi John, this is John speaking';
            const specs: ReplacementSpecs = {
                category: 'Speakers',
                replacements: [
                    {
                        target: 'John Smith',
                        toSearch: ['John']
                    }
                ]
            };

            const expected = 'John Smith: Hi John Smith, this is John Smith speaking';
            expect(service.applyReplacements(content, specs)).toBe(expected);
        });
    });
});
