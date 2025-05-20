import { ChunkHierarchyService } from './chunk-hierarchy.service';
import { ChunkHierarchyType } from '../../models/chunk';
import { RootNode, HeaderNode } from '../../models/interfaces';

describe('ChunkHierarchyService', () => {
    const service = new ChunkHierarchyService();

    function fakeRenderToMarkdown(root: RootNode): string {
        return 'MARKDOWN:' + root.content;
    }

    it('construit la hiérarchie complète pour un chunk profond', () => {
        // Simule un fichier /notes/projets/ProjetX.md avec headers
        const root: RootNode = {
            content: '',
            children: [
                {
                    heading: 'Objectifs',
                    level: 1,
                    content: '',
                    children: [
                        {
                            heading: 'Détail',
                            level: 2,
                            content: 'Contenu du chunk',
                            children: []
                        }
                    ]
                }
            ]
        };
        const chunk = service.buildChunkWithHierarchy(
            'notes/projets/ProjetX.md',
            root, // passer le RootNode racine
            'Détail'
        );
        expect(chunk.markdown).toBe('Contenu du chunk');
        expect(chunk.hierarchy).toEqual([
            { name: 'notes', type: ChunkHierarchyType.Directory },
            { name: 'projets', type: ChunkHierarchyType.Directory },
            { name: 'ProjetX', type: ChunkHierarchyType.File },
            { name: 'Objectifs', type: ChunkHierarchyType.Header },
            { name: 'Détail', type: ChunkHierarchyType.Header }
        ]);
    });

    it('retourne [] si le heading est absent', () => {
        const root: RootNode = { content: '', children: [] };
        const path = service.findHeadingPathInRoot(root, 'Inexistant');
        expect(path).toEqual([]);
    });

    it('ne chunk QUE les feuilles avec contenu, jamais les intermédiaires même s\'ils ont du contenu', () => {
        // Simule un fichier avec un header intermédiaire qui a du contenu ET un enfant feuille avec contenu
        const root: RootNode = {
            content: '',
            children: [
                {
                    heading: 'Header 1',
                    level: 1,
                    content: 'Contenu INTERMEDIAIRE', // doit être ignoré car Header 1 a un enfant
                    children: [
                        {
                            heading: 'Feuille A',
                            level: 2,
                            content: 'Contenu A',
                            children: []
                        }
                    ]
                },
                {
                    heading: 'Header 2',
                    level: 1,
                    content: '',
                    children: [
                        {
                            heading: 'Feuille B',
                            level: 2,
                            content: 'Contenu B',
                            children: []
                        }
                    ]
                }
            ]
        };
        const chunks = service.buildAllChunksWithHierarchy(root, 'truc/file.md');
        expect(chunks).toHaveLength(2);
        expect(chunks[0]).toEqual({
            markdown: 'Contenu A',
            hierarchy: [
                { name: 'truc', type: ChunkHierarchyType.Directory },
                { name: 'file', type: ChunkHierarchyType.File },
                { name: 'Header 1', type: ChunkHierarchyType.Header },
                { name: 'Feuille A', type: ChunkHierarchyType.Header }
            ]
        });
        expect(chunks[1]).toEqual({
            markdown: 'Contenu B',
            hierarchy: [
                { name: 'truc', type: ChunkHierarchyType.Directory },
                { name: 'file', type: ChunkHierarchyType.File },
                { name: 'Header 2', type: ChunkHierarchyType.Header },
                { name: 'Feuille B', type: ChunkHierarchyType.Header }
            ]
        });
    });

    it('retourne un chunk pour chaque feuille finale avec contenu, même si elles sont dans des headers racines différents', () => {
        // Simule /truc/file.md avec deux headers racines distincts
        const root: RootNode = {
            content: '',
            children: [
                {
                    heading: 'Header 1',
                    level: 1,
                    content: '',
                    children: [
                        {
                            heading: 'Feuille A',
                            level: 2,
                            content: 'Contenu A',
                            children: []
                        }
                    ]
                },
                {
                    heading: 'Header 2',
                    level: 1,
                    content: '',
                    children: [
                        {
                            heading: 'Feuille B',
                            level: 2,
                            content: 'Contenu B',
                            children: []
                        }
                    ]
                }
            ]
        };
        // Collecte toutes les feuilles finales avec contenu
        function collectLeafHeaders(node: RootNode | HeaderNode): HeaderNode[] {
            if ('children' in node && node.children.length > 0) {
                return node.children.flatMap(collectLeafHeaders);
            }
            return node.content ? [node as HeaderNode] : [];
        }
        const leaves = collectLeafHeaders(root);
        // Pour chaque feuille, construit le chunk
        const chunks = leaves.map(header =>
            service.buildChunkWithHierarchy(
                'truc/file.md',
                root,
                header.heading
            )
        );
        expect(chunks).toHaveLength(2);
        expect(chunks[0]).toEqual({
            markdown: 'Contenu A',
            hierarchy: [
                { name: 'truc', type: ChunkHierarchyType.Directory },
                { name: 'file', type: ChunkHierarchyType.File },
                { name: 'Header 1', type: ChunkHierarchyType.Header },
                { name: 'Feuille A', type: ChunkHierarchyType.Header }
            ]
        });
        expect(chunks[1]).toEqual({
            markdown: 'Contenu B',
            hierarchy: [
                { name: 'truc', type: ChunkHierarchyType.Directory },
                { name: 'file', type: ChunkHierarchyType.File },
                { name: 'Header 2', type: ChunkHierarchyType.Header },
                { name: 'Feuille B', type: ChunkHierarchyType.Header }
            ]
        });
    });

    it('chunk toutes les feuilles atomiques sous un heading filtré, avec la hiérarchie complète', () => {
        // Simule un fichier avec un heading "Résumé" contenant plusieurs sous-headings imbriqués
        const service = new ChunkHierarchyService();
        const root: RootNode = {
            content: '',
            children: [
                {
                    heading: 'Résumé',
                    level: 1,
                    content: '',
                    children: [
                        {
                            heading: 'Résumé 1',
                            level: 2,
                            content: 'Texte résumé 1',
                            children: []
                        },
                        {
                            heading: 'Résumé 2',
                            level: 2,
                            content: '',
                            children: [
                                {
                                    heading: 'Résumé 2.1',
                                    level: 3,
                                    content: 'Texte résumé 2.1',
                                    children: []
                                }
                            ]
                        }
                    ]
                },
                {
                    heading: 'Autre',
                    level: 1,
                    content: 'Ne doit pas apparaître',
                    children: []
                }
            ]
        };
        // On simule la sélection du heading "Résumé" dans la config
        // On chunk toutes les feuilles atomiques SOUS ce heading
        const resumeNode = root.children.find(child => child.heading === 'Résumé');
        const chunks = service.buildAllChunksWithHierarchy(resumeNode!, 'notes/fichier.md');
    
        expect(chunks).toHaveLength(2);
        expect(chunks[0]).toEqual({
            markdown: 'Texte résumé 1',
            hierarchy: [
                { name: 'notes', type: ChunkHierarchyType.Directory },
                { name: 'fichier', type: ChunkHierarchyType.File },
                { name: 'Résumé', type: ChunkHierarchyType.Header },
                { name: 'Résumé 1', type: ChunkHierarchyType.Header }
            ]
        });
        expect(chunks[1]).toEqual({
            markdown: 'Texte résumé 2.1',
            hierarchy: [
                { name: 'notes', type: ChunkHierarchyType.Directory },
                { name: 'fichier', type: ChunkHierarchyType.File },
                { name: 'Résumé', type: ChunkHierarchyType.Header },
                { name: 'Résumé 2', type: ChunkHierarchyType.Header },
                { name: 'Résumé 2.1', type: ChunkHierarchyType.Header }
            ]
        });
    });
});
