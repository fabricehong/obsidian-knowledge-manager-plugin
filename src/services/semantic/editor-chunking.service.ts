import { App, TFile, Notice, MarkdownView } from 'obsidian';
import { ChunkingFolderConfig } from '../../settings/settings';
import { DocumentStructureService } from '../document/document-structure.service';
import { HeaderNode, RootNode, FileRootNode } from '../../models/interfaces';
import { Chunk } from '../../models/chunk';
import { ChunkHierarchyService } from './chunk-hierarchy.service';

/**
 * Service dédié à la commande "Create Chunks".
 * Parcourt les dossiers spécifiés, parse les fichiers markdown,
 * et extrait uniquement les headings demandés.
 */
export class EditorChunkingService {
    private app: App;
    private docStructureService: DocumentStructureService;

    constructor(app: App) {
        this.app = app;
        this.docStructureService = new DocumentStructureService();
    }

    /**
     * Retourne les chunks parsés depuis la config, sans insertion ni génération markdown.
     */
    async getChunksFromConfigs(configs: ChunkingFolderConfig[]): Promise<Chunk[]> {
        const results = await this.collectChunksFromFolders(configs);
        if (!results.length) {
            return [];
        }
        const chunkHierarchyService = new ChunkHierarchyService();
        let chunks: Chunk[] = [];
        for (const { path, root } of results) {
            const fileChunks = chunkHierarchyService.buildChunksWithHierarchy(path, root);
            chunks = chunks.concat(fileChunks);
        }
        return chunks;
    }


    /**
     * Pour chaque dossier de la config, parcourt les fichiers markdown
     * et extrait les headings demandés.
     * Retourne un tableau d'objets { path, root }, où path est relatif à config.folder
     */
    async collectChunksFromFolders(configs: ChunkingFolderConfig[]): Promise<{ path: string, root: RootNode }[]> {
        const vault = this.app.vault;
        const results: { path: string, root: RootNode }[] = [];

        for (const config of configs) {
            // Récupère tous les fichiers markdown du dossier
            const files = vault.getFiles().filter(f =>
                f.path.startsWith(config.folder) && f.extension === 'md'
            );
            for (const file of files) {
                const fileRoot = await this.docStructureService.buildHeaderTree(this.app, file);
                // Calcule le chemin relatif au dossier de config
                const relativePath = file.path.startsWith(config.folder)
                    ? file.path.substring(config.folder.length).replace(/^\/+/, '')
                    : file.path;
                if (!config.headings) {
                    results.push({ path: relativePath, root: fileRoot.root });
                } else {
                    for (const heading of config.headings) {
                        const node = this.docStructureService.findFirstNodeMatchingHeading(fileRoot.root, heading);
                        if (node) {
                            // Convertit le HeaderNode en RootNode
                            const root: RootNode = {
                                content: node.content,
                                children: node.children
                            };
                            results.push({ path: relativePath, root });
                        }
                    }
                }
            }
        }
        return results;
    }



    /**
     * Construit un Chunk avec hiérarchie complète à partir de file, root, heading
     */

}
