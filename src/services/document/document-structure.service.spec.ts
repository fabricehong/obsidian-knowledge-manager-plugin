import { CachedMetadata, HeadingCache } from 'obsidian';
import { HeaderNode } from '../../models/interfaces';
import { DocumentStructureService } from './document-structure.service';

describe('DocumentStructureService', () => {
    let service: DocumentStructureService;

    beforeEach(() => {
        service = new DocumentStructureService();
    });

    describe('buildHeaderTree', () => {
        it('should handle empty document', () => {
            const cache: CachedMetadata = { headings: [] };
            const content = '';

            const result = service.buildTree(cache, content);

            expect(result).toEqual({
                children: [],
                content: ''
            });
        });

        it('should handle document with only content and no headers', () => {
            const cache: CachedMetadata = { headings: [] };
            const content = 'This is some content\nwith multiple lines';

            const result = service.buildTree(cache, content);

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

            const result = service.buildTree(cache, content);

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

            const result = service.buildTree(cache, content);

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

            const result = service.buildTree(cache, content);

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

            const result = service.buildTree(cache, content);

            expect(result.children).toHaveLength(1);
            expect(result.children[0].heading).toBe('Valid');
        });

        it('should handle undefined headings in cache', () => {
            const cache: CachedMetadata = {};
            const content = 'Some content\n# Header\nMore content';

            const result = service.buildTree(cache, content);

            expect(result).toEqual({
                children: [],
                content: 'Some content\n# Header\nMore content'
            });
        });
    });

    describe('renderToMarkdown', () => {
        it('should render a simple document with no headers', () => {
            const node: HeaderNode = {
                level: 0,
                heading: '',
                content: 'Just some content\nwith multiple lines',
                children: []
            };

            const expected = 'Just some content\nwith multiple lines';
            expect(service.renderToMarkdown(node)).toBe(expected);
        });

        it('should render a document with one header', () => {
            const node: HeaderNode = {
                level: 0,
                heading: '',
                content: 'Initial content',
                children: [
                    {
                        level: 1,
                        heading: 'First Section',
                        content: 'Section content',
                        children: []
                    }
                ]
            };

            const expected = 'Initial content\n\n# First Section\nSection content';
            expect(service.renderToMarkdown(node)).toBe(expected);
        });

        it('should render a document with nested headers', () => {
            const node: HeaderNode = {
                level: 0,
                heading: '',
                content: 'Initial content',
                children: [
                    {
                        level: 1,
                        heading: 'First Section',
                        content: 'First section content',
                        children: [
                            {
                                level: 2,
                                heading: 'Subsection',
                                content: 'Subsection content',
                                children: []
                            }
                        ]
                    },
                    {
                        level: 1,
                        heading: 'Second Section',
                        content: 'Second section content',
                        children: []
                    }
                ]
            };

            const expected = 'Initial content\n\n' +
                '# First Section\n' +
                'First section content\n\n' +
                '## Subsection\n' +
                'Subsection content\n\n' +
                '# Second Section\n' +
                'Second section content';
            expect(service.renderToMarkdown(node)).toBe(expected);
        });

        it('should handle empty content fields', () => {
            const node: HeaderNode = {
                level: 0,
                heading: '',
                content: '',
                children: [
                    {
                        level: 1,
                        heading: 'Empty Section',
                        content: '',
                        children: []
                    }
                ]
            };

            const expected = '# Empty Section';
            expect(service.renderToMarkdown(node)).toBe(expected);
        });

        it('should preserve existing newlines in content', () => {
            const node: HeaderNode = {
                level: 0,
                heading: '',
                content: 'Line 1\n\nLine 2\nLine 3',
                children: [
                    {
                        level: 1,
                        heading: 'Section',
                        content: 'Section line 1\n\nSection line 2',
                        children: []
                    }
                ]
            };

            const expected = 'Line 1\n\nLine 2\nLine 3\n\n' +
                '# Section\n' +
                'Section line 1\n\nSection line 2';
            expect(service.renderToMarkdown(node)).toBe(expected);
        });

        it('should handle different header levels', () => {
            const node: HeaderNode = {
                level: 0,
                heading: '',
                content: '',
                children: [
                    {
                        level: 1,
                        heading: 'H1',
                        content: 'Level 1',
                        children: []
                    },
                    {
                        level: 2,
                        heading: 'H2',
                        content: 'Level 2',
                        children: []
                    },
                    {
                        level: 3,
                        heading: 'H3',
                        content: 'Level 3',
                        children: []
                    }
                ]
            };

            const expected = '# H1\n' +
                'Level 1\n\n' +
                '## H2\n' +
                'Level 2\n\n' +
                '### H3\n' +
                'Level 3';
            expect(service.renderToMarkdown(node)).toBe(expected);
        });
    });
});
