import { DocumentCleaningService } from '../document-cleaning.service';
import { HeaderNode, RootNode } from '../../models/interfaces';

describe('DocumentCleaningService', () => {
    let service: DocumentCleaningService;

    beforeEach(() => {
        service = new DocumentCleaningService();
    });

    describe('cleanNodeWithTwoSections', () => {
        it('should clean complex document with references at various levels', () => {
            const root: RootNode = {
                content: 'Initial content',
                children: [
                    {
                        level: 1,
                        heading: 'Section 1',
                        children: [],
                        content: 'Section content\n| ref: [[note1]]\nAfter content 1'
                    },
                    {
                        level: 1,
                        heading: 'Section 2',
                        children: [],
                        content: '| ref: [[note2]]\nAfter content 2'
                    }
                ]
            };

            const expected = `Initial content

# Section 1
Section content
| ref: [[note1]]

# Section 2
| ref: [[note2]]`;

            const result = service.cleanNode(root);
            expect(result).toBe(expected);
        });
    });

    describe('cleanNodeAndChildren', () => {
        it('should clean complex document with references at various levels', () => {
            const root: RootNode = {
                content: 'Initial content',
                children: [
                    {
                        level: 1,
                        heading: 'Section 1',
                        children: [
                            {
                                level: 2,
                                heading: 'Section 1.1',
                                children: [],
                                content: 'Some other content'
                            },
                            {
                                level: 2,
                                heading: 'Section 1.2',
                                children: [],
                                content: 'And another one'
                            }
                        ],
                        content: '| ref: [[note1]]'
                    },
                    {
                        level: 1,
                        heading: 'Section 2',
                        children: [],
                        content: 'section 2 content'
                    }
                ]
            };

            const expected = `Initial content

# Section 1
| ref: [[note1]]

# Section 2
section 2 content`;

            const result = service.cleanNode(root);
            expect(result).toBe(expected);
        });

        it('should handle empty document', () => {
            const root: RootNode = {
                content: '',
                children: []
            };

            const result = service.cleanNode(root);
            expect(result).toBe('');
        });

        it('should handle malformed references', () => {
            const root: RootNode = {
                content: 'Content\n| ref: [malformed\nMore content',
                children: []
            };

            const expected = `Content
| ref: [malformed
More content`;

            const result = service.cleanNode(root);
            expect(result).toBe(expected);
        });

        it('should throw error when child has reference and parent has reference', () => {
            const root: RootNode = {
                content: 'Initial content',
                children: [
                    {
                        level: 1,
                        heading: 'Section 1',
                        children: [
                            {
                                level: 2,
                                heading: 'Subsection 1.1',
                                children: [],
                                content: 'Some content\n| ref: [[note2]]'
                            }
                        ],
                        content: 'Section content\n| ref: [[note1]]'
                    }
                ]
            };

            expect(() => service.cleanNode(root)).toThrow('Invalid document structure');
        });
    });
});
