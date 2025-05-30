import { App, Notice, MarkdownView } from 'obsidian';
import { IndexableChunk } from './indexing/IndexableChunk';

export class EditorChunkInsertionService {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Insère dans le fichier actif les chunks fournis en Markdown.
     * Chaque chunk est converti en markdown puis inséré à la position du curseur (ou à la fin).
     */
    insertChunksInActiveFile(exports: { header: string, chunks: IndexableChunk[] }[]): void {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        const editor = markdownView?.editor;
        if (!editor) {
            new Notice('Aucun fichier markdown actif pour insérer les chunks.');
            return;
        }
        if (!exports.length) {
            new Notice('Aucun chunk à insérer.');
            return;
        }
        const allBlocks = exports.map(({ header, chunks }) => {
            if (!chunks.length) return '';
            const mdChunks = chunks.map((chunk: IndexableChunk) => chunk.pageContent);
            return `${header}\n\n${mdChunks.join('\n\n---\n\n')}`;
        }).filter(Boolean);
        const finalContent = allBlocks.join('\n\n\n');
        editor.replaceRange(finalContent, { line: editor.lastLine(), ch: 0 });
        new Notice(`${exports.reduce((acc, e) => acc + e.chunks.length, 0)} chunks insérés dans la note active.`);
    }

    /**
     * Insère dans le fichier actif un tableau d'objets JSON (ex : documents vector store).
     * Chaque objet est cloné, la propriété 'embedding' est supprimée, puis inséré sous forme de bloc de code JSON, séparé par '---'.
     * Un header (titre Markdown) peut être inséré avant les objets si fourni.
     */
    insertJsonObjectsInActiveFile(objects: any[], header?: string): void {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        const editor = markdownView?.editor;
        if (!editor) {
            new Notice('Aucun fichier markdown actif pour insérer les documents.');
            return;
        }
        if (!objects.length) {
            new Notice('Aucun document à insérer.');
            return;
        }
        const mdBlocks = objects.map(obj => {
            // Clone l'objet pour ne pas modifier l'original
            const clone = JSON.parse(JSON.stringify(obj));
            delete clone.embedding;
            return '```json\n' + JSON.stringify(clone, null, 2) + '\n```';
        });
        let finalContent = mdBlocks.join('\n\n---\n\n');
        if (header) {
            finalContent = `${header}\n\n` + finalContent;
        }
        const pos = editor.getCursor ? editor.getCursor() : undefined;
        if (pos) {
            editor.replaceRange(finalContent, pos);
        } else {
            editor.replaceRange(finalContent, { line: editor.lastLine(), ch: 0 });
        }
    }

    /**
     * Insère dans le fichier actif tous les documents de plusieurs vector stores, chacun précédé de son header.
     * @param exports Tableau d'objets { header: string, documents: any[] }
     */
    insertAllVectorStoreJsonObjects(exports: { header: string, documents: any[] }[]): void {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        const editor = markdownView?.editor;
        if (!editor) {
            new Notice('Aucun fichier markdown actif pour insérer les documents.');
            return;
        }
        if (!exports.length) {
            new Notice('Aucun document à insérer.');
            return;
        }
        const allBlocks = exports.map(({ header, documents }) => {
            if (!documents.length) return '';
            const mdBlocks = documents.map(obj => {
                const clone = JSON.parse(JSON.stringify(obj));
                delete clone.embedding;
                return '```json\n' + JSON.stringify(clone, null, 2) + '\n```';
            });
            return `${header}\n\n${mdBlocks.join('\n\n---\n\n')}`;
        }).filter(Boolean);
        const finalContent = allBlocks.join('\n\n\n');
        editor.replaceRange(finalContent, { line: editor.lastLine(), ch: 0 });
    }
}
