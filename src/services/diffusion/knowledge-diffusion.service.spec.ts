import { KnowledgeDiffusionService } from './knowledge-diffusion.service';
import { ContentFusionService } from '../content-fusion.service';
import { FilePathService } from './file-path.service';
import { OpenAIModelService } from '../openai-model.service';
import { HeaderNode, RootNode } from '../../models/interfaces';

describe('KnowledgeDiffusionService', () => {
    let service: KnowledgeDiffusionService;
    let mockContentFusionService: ContentFusionService;
    let mockFilePathService: FilePathService;

    beforeEach(() => {
        mockContentFusionService = {
            fuseContents: jest.fn()
        } as any;
        mockFilePathService = {
            extractDestination: jest.fn()
        } as any;
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
                    content: 'Intro text\n| ref: [[note1]]',
                    children: [{
                        level: 2,
                        heading: 'Subsection',
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
                content: 'Root content',
                children: [
                    {
                        level: 1,
                        heading: 'Section 1',
                        content: '| ref: [[note1]]\nSection content1',
                        children: []
                    },
                    {
                        level: 1,
                        heading: 'Section 2',
                        content: '| ref: [[note2]]\nSection content2',
                        children: []
                    },
                ]
            };

            const result = service.buildDiffusionRepresentation(root);

            expect(result).toHaveLength(2);
            expect(result[0].destination).toBe('note1');
            expect(result[0].toIntegrate).toHaveLength(1);
            expect(result[0].toIntegrate).toEqual([
                {
                    breadcrumbs: ['Section 1'],
                    content: 'Section content1'
                },
            ]);

            expect(result[1].destination).toBe('note2');
            expect(result[1].toIntegrate).toHaveLength(1);
            expect(result[1].toIntegrate).toEqual([
                {
                    breadcrumbs: ['Section 2'],
                    content: 'Section content2'
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
                        content: 'Mon résumé',
                        children: [
                            {
                                level: 2,
                                heading: 'sous section',
                                content: 'un texte d\'intro\n| ref: [[knowledge 1]]\ndu texte ici',
                                children: []
                            },
                            {
                                level: 2,
                                heading: 'Des choses ici',
                                content: 'un autre texte d\'intro\n| ref: [[knowledge 2]]',
                                children: [
                                    {
                                        level: 3,
                                        heading: 'première sub',
                                        content: 'un peu ici',
                                        children: []
                                    },
                                    {
                                        level: 3,
                                        heading: 'deuxième sub',
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
                content: '',
                children: [{
                    level: 1,
                    heading: 'Section',
                    children: [],
                    content: '| ref:\nMalformed ref\n| ref: [[  ]]\nEmpty brackets'
                }]
            };

            const result = service.buildDiffusionRepresentation(root);

            expect(result).toHaveLength(0);
        });
    });
});
