import { ReplacementSpecsParsingService } from './replacement-specs-parsing.service';
import { ReplacementSpecs } from '../../models/schemas';
import { YamlValidationError } from '../../models/errors';

describe('YamlBlockService', () => {
    let service: ReplacementSpecsParsingService;

    beforeEach(() => {
        service = new ReplacementSpecsParsingService();
    });

    describe('fromYamlBlock', () => {
        it('should extract YAML content from code block', () => {
            const input = '```yaml\nkey: value\n```';
            expect(service.fromYamlBlock(input)).toBe('key: value');
        });

        it('should handle multiline YAML content', () => {
            const input = '```yaml\nkey1: value1\nkey2: value2\n```';
            expect(service.fromYamlBlock(input)).toBe('key1: value1\nkey2: value2');
        });

        it('should return original content if no code block found', () => {
            const input = 'plain text';
            expect(service.fromYamlBlock(input)).toBe('plain text');
        });

        it('should handle content with extra whitespace', () => {
            const input = '   ```yaml   \n  key: value  \n   ```   ';
            expect(service.fromYamlBlock(input)).toBe('  key: value  ');
        });

        it('should extract YAML content from code block', () => {
            const content = 'Some text\n```yaml\ncategory: Test\nreplacements: []\n```\nMore text';
            const expected = 'category: Test\nreplacements: []';
            expect(service.fromYamlBlock(content)).toBe(expected);
        });
    });

    describe('toYamlBlock', () => {
        it('should wrap content in YAML code block', () => {
            const input = 'key: value';
            expect(service.toYamlBlock(input)).toBe('```yaml\nkey: value\n```');
        });

        it('should handle multiline content', () => {
            const input = 'key1: value1\nkey2: value2';
            expect(service.toYamlBlock(input)).toBe('```yaml\nkey1: value1\nkey2: value2\n```');
        });

        it('should handle empty content', () => {
            expect(service.toYamlBlock('')).toBe('```yaml\n\n```');
        });
    });

    describe('fromYaml', () => {
        it('should parse valid YAML into ReplacementSpecs', () => {
            const yaml = `
category: Test
replacements:
  - target: Target1
    toSearch: [Search1, Search2]
  - target: Target2
    toSearch: [Search3]
`;
            const expected: ReplacementSpecs = {
                category: 'Test',
                replacements: [
                    {
                        target: 'Target1',
                        toSearch: ['Search1', 'Search2']
                    },
                    {
                        target: 'Target2',
                        toSearch: ['Search3']
                    }
                ]
            };

            expect(service.fromYaml(yaml, 'test.md')).toEqual(expected);
        });

        it('should throw YamlValidationError for invalid YAML', () => {
            const yaml = `
category: Test
replacements:
  - target: Target1
    invalidKey: [Search1, Search2]
`;
            expect(() => service.fromYaml(yaml, 'test.md')).toThrow(YamlValidationError);
        });

        it('should throw YamlValidationError for missing category', () => {
            const yaml = `
replacements:
  - target: Target1
    toSearch: [Search1, Search2]
`;
            expect(() => service.fromYaml(yaml, 'test.md')).toThrow(YamlValidationError);
        });

        it('should throw YamlValidationError for missing replacements', () => {
            const yaml = `
category: Test
`;
            expect(() => service.fromYaml(yaml, 'test.md')).toThrow(YamlValidationError);
        });

        it('should throw YamlValidationError for empty toSearch array', () => {
            const yaml = `
category: Test
replacements:
  - target: Target1
    toSearch: []
`;
            expect(() => service.fromYaml(yaml, 'test.md')).toThrow(YamlValidationError);
        });

        it('should throw YamlValidationError for invalid toSearch items', () => {
            const yaml = `
category: Test
replacements:
  - target: Target1
    toSearch: ["", null]
`;
            expect(() => service.fromYaml(yaml, 'test.md')).toThrow(YamlValidationError);
        });
    });

    describe('toYaml', () => {
        it('should convert ReplacementSpecs to YAML string', () => {
            const input: ReplacementSpecs = {
                category: 'Speakers',
                replacements: [
                    {
                        target: 'John Smith',
                        toSearch: ['John', 'Johnny']
                    }
                ]
            };
            const expected = `category: Speakers
replacements:
  - target: John Smith
    toSearch:
      - John
      - Johnny
`;
            expect(service.toYaml(input)).toBe(expected);
        });

        it('should handle empty replacements', () => {
            const input: ReplacementSpecs = {
                category: 'Speakers',
                replacements: []
            };
            const expected = `category: Speakers
replacements: []
`;
            expect(service.toYaml(input)).toBe(expected);
        });

        it('should convert ReplacementSpecs to YAML', () => {
            const specs: ReplacementSpecs = {
                category: 'Test',
                replacements: [
                    {
                        target: 'Target1',
                        toSearch: ['Search1', 'Search2']
                    }
                ]
            };
            const yaml = service.toYaml(specs);
            const parsed = service.fromYaml(yaml, 'test.md');
            expect(parsed).toEqual(specs);
        });

        it('should convert ReplacementSpecs to YAML', () => {
            const specs: ReplacementSpecs = {
                category: 'Test',
                replacements: [
                    {
                        target: 'Target1',
                        toSearch: ['Search1']
                    },
                    {
                        target: 'Target2',
                        toSearch: ['Search2', 'Search3']
                    }
                ]
            };
            const expected = `category: Test
replacements:
  - target: Target1
    toSearch:
      - Search1
  - target: Target2
    toSearch:
      - Search2
      - Search3
`;
            expect(service.toYaml(specs)).toBe(expected);
        });

        it('should handle empty replacements array', () => {
            const specs: ReplacementSpecs = {
                category: 'Test',
                replacements: []
            };
            const expected = `category: Test
replacements: []
`;
            expect(service.toYaml(specs)).toBe(expected);
        });
    });
});
