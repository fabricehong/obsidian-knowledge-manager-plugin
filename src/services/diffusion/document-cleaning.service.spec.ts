import { DocumentCleaningService } from './document-cleaning.service';
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

            const expected: RootNode = {
                content: 'Initial content',
                children: [
                    {
                        level: 1,
                        heading: 'Section 1',
                        children: [],
                        content: 'Section content\n| ref: [[note1]]'
                    },
                    {
                        level: 1,
                        heading: 'Section 2',
                        children: [],
                        content: '| ref: [[note2]]'
                    }
                ]
            };

            const result = service.cleanNode(root);
            expect(result).toEqual(expected);
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

            const expected: RootNode = {
                content: 'Initial content',
                children: [
                    {
                        level: 1,
                        heading: 'Section 1',
                        children: [],  // Children should be empty because of reference
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

            const result = service.cleanNode(root);
            expect(result).toEqual(expected);
        });

        it('should handle empty document', () => {
            const root: RootNode = {
                content: '',
                children: []
            };

            const expected: RootNode = {
                content: '',
                children: []
            };

            const result = service.cleanNode(root);
            expect(result).toEqual(expected);
        });

        it('should handle malformed references', () => {
            const root: RootNode = {
                content: 'Content\n| ref: [malformed\nMore content',
                children: []
            };

            const expected: RootNode = {
                content: 'Content\n| ref: [malformed\nMore content',
                children: []
            };

            const result = service.cleanNode(root);
            expect(result).toEqual(expected);
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

            expect(() => service.cleanNode(root)).toThrow('Invalid document structure: Found references in children of a node that already has references. Parent node: Section 1. Children with refs: Subsection 1.1');
        });
    });
});
