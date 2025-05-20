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
    buildChunkWithHierarchy(
        filePath: string,
        root: RootNode,
        heading: string
    ): Chunk {
        // 1. Hiérarchie filesystem
        const pathParts = filePath.split('/');
        const fileNameWithExt = pathParts.pop()!;
        const fileName = fileNameWithExt.replace(/\.[^.]+$/, ''); // retire extension
        const directories = pathParts.map(name => ({ name, type: ChunkHierarchyType.Directory }));
        const fileLevel: ChunkHierarchyLevel = { name: fileName, type: ChunkHierarchyType.File };

        // 2. Recherche du header cible et de son chemin (DFS)
        function dfs(node: HeaderNode, path: string[]): { node: HeaderNode, path: string[] } | null {
            const newPath = [...path, node.heading];
            if (node.heading === heading) {
                return { node, path: newPath };
            }
            for (const child of node.children) {
                const found = dfs(child, newPath);
                if (found) return found;
            }
            return null;
        }
        let found: { node: HeaderNode, path: string[] } | null = null;
        for (const child of root.children) {
            found = dfs(child, []);
            if (found) break;
        }
        // 3. Si trouvé, construit la hiérarchie complète
        let headerLevels: ChunkHierarchyLevel[] = [];
        let markdown = '';
        if (found) {
            headerLevels = found.path.map(h => ({ name: h, type: ChunkHierarchyType.Header }));
            markdown = found.node.content;
        }
        // 4. Retourne le chunk
        return {
            markdown,
            hierarchy: [...directories, fileLevel, ...headerLevels]
        };
    }

    /**
     * Retourne le chemin des headings parents (du root jusqu'au heading cible) dans un RootNode
     */
    /**
     * Retourne tous les chunks atomiques du document, avec leur hiérarchie complète.
     */
    buildAllChunksWithHierarchy(root: RootNode, filePath: string): Chunk[] {
        // Collecte toutes les feuilles finales avec contenu
        function collectLeafHeaders(node: RootNode | HeaderNode): HeaderNode[] {
            // On ne retient que les feuilles (pas d'enfants) ET qui ont du contenu
            if ('children' in node && node.children.length > 0) {
                return node.children.flatMap(collectLeafHeaders);
            }
            if (typeof node.content === 'string' && node.content.trim().length > 0 && (!('children' in node) || node.children.length === 0)) {
                return [node as HeaderNode];
            }
            return [];
        }
        const leaves = collectLeafHeaders(root);
        console.warn('[buildAllChunksWithHierarchy] feuilles collectées:', leaves.length);
        leaves.forEach((leaf, i) => {
            console.warn(`[buildAllChunksWithHierarchy] feuille[${i}] heading="${leaf.heading}" content="${(leaf.content ?? '').replace(/\n/g, '\\n')}" content.trim="${(leaf.content ?? '').trim().replace(/\n/g, '\\n')}"`);
        });
        const chunks = leaves
            .map(header => this.buildChunkWithHierarchy(filePath, root, header.heading))
            .filter(chunk => typeof chunk.markdown === 'string' && chunk.markdown.trim().length > 0);
        console.log('[buildAllChunksWithHierarchy] chunks retenus:', chunks.length);
        chunks.forEach((chunk, i) => {
            console.log(`[buildAllChunksWithHierarchy] chunk[${i}] markdown="${chunk.markdown.replace(/\n/g, '\\n')}" hierarchy=`, chunk.hierarchy);
        });
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
