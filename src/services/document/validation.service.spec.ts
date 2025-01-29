import { TFile } from "obsidian";
import { RootNode } from "../../models/interfaces";
import { ValidationService } from "./validation.service";

describe('ValidationService', () => {
    describe('validateNodeReferences', () => {
        it('should pass when no references are present', () => {
            const root: RootNode = {
                content: 'Root content',
                children: [
                    {
                        level: 1,
                        heading: 'Section 1',
                        children: [
                            {
                                level: 2,
                                heading: 'Subsection 1.1',
                                children: [],
                                content: 'Some content'
                            }
                        ],
                        content: 'Section content'
                    }
                ]
            };

            expect(() => ValidationService.validateNodeReferences(root)).not.toThrow();
        });

        it('should pass when references are in leaf nodes only', () => {
            const root: RootNode = {
                content: 'Root content',
                children: [
                    {
                        level: 1,
                        heading: 'Section 1',
                        children: [
                            {
                                level: 2,
                                heading: 'Subsection 1.1',
                                children: [],
                                content: 'Some content\n| ref: [[note1]]'
                            }
                        ],
                        content: 'Section content'
                    }
                ]
            };

            expect(() => ValidationService.validateNodeReferences(root)).not.toThrow();
        });

        it('should pass when references are in root node', () => {
            const root: RootNode = {
                content: 'Root content\n| ref: [[note1]]',
                children: [
                    {
                        level: 1,
                        heading: 'Section 1',
                        children: [],
                        content: 'Section content'
                    }
                ]
            };

            expect(() => ValidationService.validateNodeReferences(root)).not.toThrow();
        });

        it('should throw when parent and child both have references', () => {
            const root: RootNode = {
                content: 'Root content',
                children: [
                    {
                        level: 1,
                        heading: 'Section 1',
                        children: [
                            {
                                level: 2,
                                heading: 'Subsection 1.1',
                                children: [],
                                content: 'Sub content\n| ref: [[note2]]'
                            }
                        ],
                        content: 'Section content\n| ref: [[note1]]'
                    }
                ]
            };

            expect(() => ValidationService.validateNodeReferences(root))
                .toThrow('Invalid document structure: Found references in children of a node that already has references');
        });

        it('should throw when parent and multiple children have references', () => {
            const root: RootNode = {
                content: 'Root content',
                children: [
                    {
                        level: 1,
                        heading: 'Section 1',
                        children: [
                            {
                                level: 2,
                                heading: 'Subsection 1.1',
                                children: [],
                                content: 'Sub content 1\n| ref: [[note2]]'
                            },
                            {
                                level: 2,
                                heading: 'Subsection 1.2',
                                children: [],
                                content: 'Sub content 2\n| ref: [[note3]]'
                            }
                        ],
                        content: 'Section content\n| ref: [[note1]]'
                    }
                ]
            };

            expect(() => ValidationService.validateNodeReferences(root))
                .toThrow('Invalid document structure: Found references in children of a node that already has references');
        });

        it('should throw when deeply nested child has reference under parent with reference', () => {
            const root: RootNode = {
                content: 'Root content',
                children: [
                    {
                        level: 1,
                        heading: 'Section 1',
                        children: [
                            {
                                level: 2,
                                heading: 'Subsection 1.1',
                                children: [
                                    {
                                        level: 3,
                                        heading: 'Subsection 1.1.1',
                                        children: [],
                                        content: 'Deep content\n| ref: [[note2]]'
                                    }
                                ],
                                content: 'Sub content'
                            }
                        ],
                        content: 'Section content\n| ref: [[note1]]'
                    }
                ]
            };

            expect(() => ValidationService.validateNodeReferences(root))
                .toThrow('Invalid document structure: Found references in children of a node that already has references');
        });
    });
});
