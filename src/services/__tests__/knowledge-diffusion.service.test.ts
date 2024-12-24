import { KnowledgeDiffusionService } from '../knowledge-diffusion.service';
import { ContentFusionService } from '../content-fusion.service';
import { FilePathService } from '../file-path.service';
import { OpenAIModelService } from '../openai-model.service';
import { HeaderNode, RootNode } from '../../models/interfaces';

describe('KnowledgeDiffusionService', () => {
    let service: KnowledgeDiffusionService;
    let mockContentFusionService: ContentFusionService;
    let mockFilePathService: FilePathService;

    beforeEach(() => {
        const mockOpenAIModelService = new OpenAIModelService();
        mockContentFusionService = new ContentFusionService(mockOpenAIModelService);
        mockFilePathService = new FilePathService();
        service = new KnowledgeDiffusionService(mockContentFusionService, mockFilePathService);
    });

    describe('buildDiffusionRepresentation', () => {
        it('should handle root level references', () => {
            const root: RootNode = {
                content: 'Some intro text\n| ref: [[note1]]\nContent for note 1',
                children: []
            };

            const result = service.buildDiffusionRepresentation(root);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                destination: 'note1',
                toIntegrate: [{
                    breadcrumbs: [],
                    content: 'Content for note 1'
                }]
            });
        });

        it('should handle references in headers', () => {
            const root: RootNode = {
                content: '',
                children: [{
                    level: 1,
                    heading: 'Section 1',
                    position: {
                        start: { line: 0, col: 0, offset: 0 },
                        end: { line: 0, col: 0, offset: 0 }
                    },
                    content: 'Intro text\n| ref: [[note1]]\nContent for note 1',
                    children: []
                }]
            };

            const result = service.buildDiffusionRepresentation(root);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                destination: 'note1',
                toIntegrate: [{
                    breadcrumbs: ['Section 1'],
                    content: 'Content for note 1'
                }]
            });
        });

        it('should include child headers in reference content', () => {
            const root: RootNode = {
                content: '',
                children: [{
                    level: 1,
                    heading: 'Section 1',
                    position: {
                        start: { line: 0, col: 0, offset: 0 },
                        end: { line: 0, col: 0, offset: 0 }
                    },
                    content: 'Intro text\n| ref: [[note1]]',
                    children: [{
                        level: 2,
                        heading: 'Subsection',
                        position: {
                            start: { line: 0, col: 0, offset: 0 },
                            end: { line: 0, col: 0, offset: 0 }
                        },
                        content: 'Subsection content',
                        children: []
                    }]
                }]
            };

            const result = service.buildDiffusionRepresentation(root);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                destination: 'note1',
                toIntegrate: [{
                    breadcrumbs: ['Section 1'],
                    content: '## Subsection\n\nSubsection content'
                }]
            });
        });

        it('should handle multiple references to the same destination', () => {
            const root: RootNode = {
                content: '| ref: [[note1]]\nRoot content',
                children: [{
                    level: 1,
                    heading: 'Section 1',
                    position: {
                        start: { line: 0, col: 0, offset: 0 },
                        end: { line: 0, col: 0, offset: 0 }
                    },
                    content: '| ref: [[note1]]\nSection content',
                    children: []
                }]
            };

            const result = service.buildDiffusionRepresentation(root);

            expect(result).toHaveLength(1);
            expect(result[0].destination).toBe('note1');
            expect(result[0].toIntegrate).toHaveLength(2);
            expect(result[0].toIntegrate).toEqual([
                {
                    breadcrumbs: [],
                    content: 'Root content'
                },
                {
                    breadcrumbs: ['Section 1'],
                    content: 'Section content'
                }
            ]);
        });

        it('should handle your complex example', () => {
            const root: RootNode = {
                content: 'Voici un texte.',
                children: [
                    {
                        level: 1,
                        heading: 'Résumé',
                        position: {
                            start: { line: 0, col: 0, offset: 0 },
                            end: { line: 0, col: 0, offset: 0 }
                        },
                        content: 'Mon résumé',
                        children: [
                            {
                                level: 2,
                                heading: 'sous section',
                                position: {
                                    start: { line: 0, col: 0, offset: 0 },
                                    end: { line: 0, col: 0, offset: 0 }
                                },
                                content: 'un texte d\'intro\n| ref: [[knowledge 1]]\ndu texte ici',
                                children: []
                            },
                            {
                                level: 2,
                                heading: 'Des choses ici',
                                position: {
                                    start: { line: 0, col: 0, offset: 0 },
                                    end: { line: 0, col: 0, offset: 0 }
                                },
                                content: 'un autre texte d\'intro\n| ref: [[knowledge 2]]',
                                children: [
                                    {
                                        level: 3,
                                        heading: 'première sub',
                                        position: {
                                            start: { line: 0, col: 0, offset: 0 },
                                            end: { line: 0, col: 0, offset: 0 }
                                        },
                                        content: 'un peu ici',
                                        children: []
                                    },
                                    {
                                        level: 3,
                                        heading: 'deuxième sub',
                                        position: {
                                            start: { line: 0, col: 0, offset: 0 },
                                            end: { line: 0, col: 0, offset: 0 }
                                        },
                                        content: 'et aussi la.',
                                        children: []
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        level: 1,
                        heading: 'Transcript',
                        position: {
                            start: { line: 0, col: 0, offset: 0 },
                            end: { line: 0, col: 0, offset: 0 }
                        },
                        content: '| ref: [[knowledge 1]]\n\nFabrice:\nSalut\n\nEdouard:\nA bientot !',
                        children: []
                    }
                ]
            };

            const result = service.buildDiffusionRepresentation(root);

            expect(result).toHaveLength(2);
            
            // Check knowledge 1 entries
            const knowledge1 = result.find(r => r.destination === 'knowledge 1');
            expect(knowledge1).toBeDefined();
            expect(knowledge1?.toIntegrate).toHaveLength(2);
            expect(knowledge1?.toIntegrate[0]).toEqual({
                breadcrumbs: ['Résumé', 'sous section'],
                content: 'du texte ici'
            });
            expect(knowledge1?.toIntegrate[1]).toEqual({
                breadcrumbs: ['Transcript'],
                content: 'Fabrice:\nSalut\n\nEdouard:\nA bientot !'
            });

            // Check knowledge 2 entry
            const knowledge2 = result.find(r => r.destination === 'knowledge 2');
            expect(knowledge2).toBeDefined();
            expect(knowledge2?.toIntegrate).toHaveLength(1);
            expect(knowledge2?.toIntegrate[0]).toEqual({
                breadcrumbs: ['Résumé', 'Des choses ici'],
                content: '### première sub\n\nun peu ici\n\n### deuxième sub\n\net aussi la.'
            });
        });

        it('should handle empty or malformed references', () => {
            const root: RootNode = {
                content: '| ref: [[]]\nEmpty ref',
                children: [{
                    level: 1,
                    heading: 'Section',
                    position: {
                        start: { line: 0, col: 0, offset: 0 },
                        end: { line: 0, col: 0, offset: 0 }
                    },
                    content: '| ref:\nMalformed ref\n| ref: [[  ]]\nEmpty brackets',
                    children: []
                }]
            };

            const result = service.buildDiffusionRepresentation(root);

            expect(result).toHaveLength(0);
        });
    });
});
