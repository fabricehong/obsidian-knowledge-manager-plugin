import { DocumentStructureService } from '../document-structure.service';
import { CachedMetadata, HeadingCache } from 'obsidian';
import { HeaderNode, RootNode } from '../../models/interfaces';

describe('DocumentStructureService', () => {
    let service: DocumentStructureService;

    beforeEach(() => {
        service = new DocumentStructureService();
    });

    describe('buildHeaderTree', () => {
        it('should handle empty document', () => {
            const cache: CachedMetadata = { headings: [] };
            const content = '';

            const result = service.buildHeaderTree(cache, content);

            expect(result).toEqual({
                children: [],
                content: ''
            });
        });

        it('should handle document with only content and no headers', () => {
            const cache: CachedMetadata = { headings: [] };
            const content = 'This is some content\nwith multiple lines';

            const result = service.buildHeaderTree(cache, content);

            expect(result).toEqual({
                children: [],
                content: 'This is some content\nwith multiple lines'
            });
        });

        it('should handle single header with content', () => {
            const heading: HeadingCache = {
                level: 1,
                heading: 'Test Header',
                position: {
                    start: { line: 2, col: 0, offset: 20 },
                    end: { line: 2, col: 15, offset: 35 }
                }
            };
            const cache: CachedMetadata = { headings: [heading] };
            const content = 'Initial content\n\n# Test Header\nHeader content';

            const result = service.buildHeaderTree(cache, content);

            expect(result).toEqual({
                children: [{
                    level: 1,
                    heading: 'Test Header',
                    children: [],
                    content: 'Header content'
                }],
                content: 'Initial content'
            });
        });

        it('should handle nested headers', () => {
            const headings: HeadingCache[] = [
                {
                    level: 1,
                    heading: 'Main',
                    position: {
                        start: { line: 0, col: 0, offset: 0 },
                        end: { line: 0, col: 7, offset: 7 }
                    }
                },
                {
                    level: 2,
                    heading: 'Sub1',
                    position: {
                        start: { line: 2, col: 0, offset: 15 },
                        end: { line: 2, col: 8, offset: 23 }
                    }
                },
                {
                    level: 2,
                    heading: 'Sub2',
                    position: {
                        start: { line: 4, col: 0, offset: 35 },
                        end: { line: 4, col: 8, offset: 43 }
                    }
                }
            ];
            const cache: CachedMetadata = { headings };
            const content = '# Main\nMain content\n## Sub1\nSub1 content\n## Sub2\nSub2 content';

            const result = service.buildHeaderTree(cache, content);

            expect(result).toEqual({
                children: [{
                    level: 1,
                    heading: 'Main',
                    children: [
                        {
                            level: 2,
                            heading: 'Sub1',
                            children: [],
                            content: 'Sub1 content'
                        },
                        {
                            level: 2,
                            heading: 'Sub2',
                            children: [],
                            content: 'Sub2 content'
                        }
                    ],
                    content: 'Main content'
                }],
                content: ''
            });
        });

        it('should handle complex header hierarchy', () => {
            const headings: HeadingCache[] = [
                {
                    level: 1,
                    heading: 'H1',
                    position: {
                        start: { line: 1, col: 0, offset: 0 },
                        end: { line: 1, col: 5, offset: 5 }
                    }
                },
                {
                    level: 2,
                    heading: 'H2',
                    position: {
                        start: { line: 3, col: 0, offset: 15 },
                        end: { line: 3, col: 5, offset: 20 }
                    }
                },
                {
                    level: 3,
                    heading: 'H3',
                    position: {
                        start: { line: 5, col: 0, offset: 30 },
                        end: { line: 5, col: 5, offset: 35 }
                    }
                },
                {
                    level: 2,
                    heading: 'H2-2',
                    position: {
                        start: { line: 7, col: 0, offset: 45 },
                        end: { line: 7, col: 7, offset: 52 }
                    }
                }
            ];
            const cache: CachedMetadata = { headings };
            const content = `
# H1
H1 content
## H2
H2 content
### H3
H3 content
## H2-2
H2-2 content`;

            const result = service.buildHeaderTree(cache, content);

            expect(result.children[0]).toEqual({
                level: 1,
                heading: 'H1',
                children: [
                    {
                        level: 2,
                        heading: 'H2',
                        children: [
                            {
                                level: 3,
                                heading: 'H3',
                                children: [],
                                content: 'H3 content'
                            }
                        ],
                        content: 'H2 content'
                    },
                    {
                        level: 2,
                        heading: 'H2-2',
                        children: [],
                        content: 'H2-2 content'
                    }
                ],
                content: 'H1 content'
            });
        });

        it('should handle invalid heading positions', () => {
            const headings: HeadingCache[] = [
                {
                    level: 1,
                    heading: 'Valid',
                    position: {
                        start: { line: 0, col: 0, offset: 0 },
                        end: { line: 0, col: 8, offset: 8 }
                    }
                },
                {
                    level: 2,
                    heading: 'Invalid',
                    // @ts-ignore
                    position: undefined
                }
            ];
            const cache: CachedMetadata = { headings };
            const content = '# Valid\nValid content\n## Invalid\nInvalid content';

            const result = service.buildHeaderTree(cache, content);

            expect(result.children).toHaveLength(1);
            expect(result.children[0].heading).toBe('Valid');
        });

        it('should handle undefined headings in cache', () => {
            const cache: CachedMetadata = {};
            const content = 'Some content\n# Header\nMore content';

            const result = service.buildHeaderTree(cache, content);

            expect(result).toEqual({
                children: [],
                content: 'Some content\n# Header\nMore content'
            });
        });
    });
});
