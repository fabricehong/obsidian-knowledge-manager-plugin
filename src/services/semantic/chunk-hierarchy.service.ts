import { Chunk, ChunkHierarchyLevel, ChunkHierarchyType } from '../../models/chunk';
import { RootNode, HeaderNode } from '../../models/interfaces';

/**
 * Service indépendant de la couche Obsidian pour construire des chunks hiérarchiques.
 */
export class ChunkHierarchyService {
    /**
     * Construit un Chunk avec hiérarchie complète à partir de filePath, root, heading, et une fonction de rendu markdown.
     * @param filePath Chemin du fichier (ex : notes/projets/ProjetX.md)
     * @param root RootNode de la sous-arborescence du heading
     * @param heading Le heading cible
     * @param renderToMarkdown Fonction pour transformer le RootNode en markdown
     */
    buildChunksWithHierarchy(
        filePath: string,
        root: RootNode | HeaderNode
    ): Chunk[] {
        // 1. Hiérarchie filesystem
        const pathParts = filePath.split('/');
        const fileNameWithExt = pathParts.pop()!;
        const fileName = fileNameWithExt.replace(/\.[^.]+$/, ''); // retire extension
        const directories = pathParts.map(name => ({ name, type: ChunkHierarchyType.Directory }));
        const fileLevel: ChunkHierarchyLevel = { name: fileName, type: ChunkHierarchyType.File };

        // Parcours récursif de l'arbre : à chaque noeud avec du contenu (non vide), crée un chunk
        function collectChunks(node: HeaderNode | RootNode, parentHeaders: string[]): Chunk[] {
            let chunks: Chunk[] = [];
            // Détection robuste d'un HeaderNode
            const isHeaderNode = Object.prototype.hasOwnProperty.call(node, 'heading');
            const currentHeaders = isHeaderNode
                ? [...parentHeaders, (node as HeaderNode).heading]
                : parentHeaders;
            if (typeof node.content === 'string' && node.content.trim().length > 0) {
                // Crée un chunk pour ce noeud avec toute la hiérarchie de headers parents + heading courant
                const headerLevels = isHeaderNode
                    ? [...parentHeaders, (node as HeaderNode).heading].map(h => ({ name: h, type: ChunkHierarchyType.Header }))
                    : parentHeaders.map(h => ({ name: h, type: ChunkHierarchyType.Header }));
                chunks.push({
                    markdown: node.content,
                    hierarchy: [...directories, fileLevel, ...headerLevels]
                });
            }
            if ('children' in node && node.children.length > 0) {
                for (const child of node.children) {
                    chunks = chunks.concat(collectChunks(child, currentHeaders));
                }
            }
            return chunks;
        }
        const path: string[] = [];
        const chunks = collectChunks(root, path);
        return chunks;

    }

    findHeadingPathInRoot(root: RootNode, targetHeading: string): string[] {
        function dfs(node: HeaderNode, path: string[]): string[] | null {
            const newPath = [...path, node.heading];
            if (node.heading === targetHeading) {
                return newPath;
            }
            for (const child of node.children) {
                const found = dfs(child, newPath);
                if (found) return found;
            }
            return null;
        }
        for (const child of root.children) {
            const found = dfs(child, []);
            if (found) return found;
        }
        return [];
    }
}
