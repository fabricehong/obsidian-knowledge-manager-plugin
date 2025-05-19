import { App, TFile, Notice, MarkdownView } from 'obsidian';
import { ChunkingFolderConfig } from '../../settings/settings';
import { DocumentStructureService } from '../document/document-structure.service';
import { HeaderNode, RootNode } from '../../models/interfaces';

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
     * Insère dans le fichier actif les chunks parsés depuis la config.
     * Chaque chunk est converti en markdown puis inséré à la position du curseur (ou à la fin).
     */
    async insertChunksInActiveFile(configs: ChunkingFolderConfig[]): Promise<void> {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        const editor = markdownView?.editor;
        if (!editor) {
            new Notice('Aucun fichier markdown actif pour insérer les chunks.');
            return;
        }

        const results = await this.collectChunksFromFolders(configs);
        if (!results.length) {
            new Notice('Aucun chunk à insérer.');
            return;
        }

        // Génère le markdown formaté pour chaque chunk
        const mdChunks = results.map(({ file, root }) => {
            const fileBlock = `\n---\n\n\`\`\`fichier\n${file.path}\n\`\`\`\n`;
            const chunkMarkdown = this.docStructureService.renderToMarkdown(root);
            return fileBlock + chunkMarkdown;
        });
        const finalContent = mdChunks.join('\n');

        // Insère à la position du curseur (ou à la fin)
        const pos = editor.getCursor ? editor.getCursor() : undefined;
        if (pos) {
            editor.replaceRange(finalContent, pos);
        } else {
            editor.replaceRange(finalContent, { line: editor.lastLine(), ch: 0 });
        }

        new Notice(`${results.length} chunks insérés dans la note active.`);
    }


    /**
     * Pour chaque dossier de la config, parcourt les fichiers markdown
     * et extrait les headings demandés.
     *
     * @param configs Configuration chunkingFolders
     * @returns Tableau d'objets { file, heading, node }
     */
    async collectChunksFromFolders(configs: ChunkingFolderConfig[]): Promise<Array<{ file: TFile, heading: string, root: RootNode }>> {
        const vault = this.app.vault;
        const results: Array<{ file: TFile, heading: string, root: RootNode }> = [];

        for (const config of configs) {
            // Récupère tous les fichiers markdown du dossier
            const files = vault.getFiles().filter(f =>
                f.path.startsWith(config.folder) && f.extension === 'md'
            );
            for (const file of files) {
                const fileRoot = await this.docStructureService.buildHeaderTree(this.app, file);
                for (const heading of config.headings) {
                    const node = this.docStructureService.findFirstNodeMatchingHeading(fileRoot.root, heading);
                    if (node) {
                        // On place le contenu et les sous-headings du heading dans un RootNode
                        const root: RootNode = {
                            content: node.content,
                            children: node.children
                        };
                        results.push({ file, heading, root });
                    }
                }
            }
        }
        return results;
    }
}
