import { YamlService } from './yaml.service';
import { z } from 'zod';

describe('YamlService', () => {
    // Define a test schema
    const TestSchema = z.object({
        name: z.string(),
        age: z.number(),
    });

    type TestType = z.infer<typeof TestSchema>;

    let service: YamlService<TestType>;

    beforeEach(() => {
        service = new YamlService(TestSchema, 'Invalid test data');
    });

    describe('fromYamlBlock', () => {
        it('should extract YAML content from code block', () => {
            const content = '```yaml\nname: John\nage: 30\n```';
            const result = service.fromYamlBlock(content);
            expect(result).toBe('name: John\nage: 30');
        });

        it('should throw error if no YAML block found', () => {
            const content = 'Just some text';
            expect(() => service.fromYamlBlock(content)).toThrow('No YAML block found in content');
        });
    });

    describe('toYamlBlock', () => {
        it('should convert content to YAML block', () => {
            const content = 'name: John\nage: 30';
            const result = service.toYamlBlock(content);
            expect(result).toBe('```yaml\nname: John\nage: 30\n```');
        });
    });

    describe('fromYaml', () => {
        it('should parse valid YAML content', () => {
            const content = 'name: John\nage: 30';
            const result = service.fromYaml(content);
            expect(result).toEqual({ name: 'John', age: 30 });
        });

        it('should throw error for invalid YAML content', () => {
            const content = 'invalid: - yaml: content';
            expect(() => service.fromYaml(content)).toThrow();
        });

        it('should throw error for content not matching schema', () => {
            const content = 'name: John\nage: "thirty"';
            expect(() => service.fromYaml(content)).toThrow();
        });
    });

    describe('toYaml', () => {
        it('should convert data to YAML string', () => {
            const data = { name: 'John', age: 30 };
            const result = service.toYaml(data);
            expect(result).toBe('name: John\nage: 30\n');
        });
    });
});
