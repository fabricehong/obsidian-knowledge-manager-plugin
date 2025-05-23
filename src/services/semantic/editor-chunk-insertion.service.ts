import { App, Notice, MarkdownView } from 'obsidian';
import { IndexableChunk } from '../../semantic/indexing/IndexableChunk';

export class EditorChunkInsertionService {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Insère dans le fichier actif les chunks fournis en Markdown.
     * Chaque chunk est converti en markdown puis inséré à la position du curseur (ou à la fin).
     */
    insertChunksInActiveFile(chunks: IndexableChunk[]): void {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        const editor = markdownView?.editor;
        if (!editor) {
            new Notice('Aucun fichier markdown actif pour insérer les chunks.');
            return;
        }
        if (!chunks.length) {
            new Notice('Aucun chunk à insérer.');
            return;
        }
        // Génère le markdown pour chaque chunk avec hiérarchie
        const mdChunks = chunks.map(chunk => {
            return chunk.pageContent;
        });
        const finalContent = mdChunks.join('\n\n---\n\n');
        // Insère à la position du curseur (ou à la fin)
        const pos = editor.getCursor ? editor.getCursor() : undefined;
        if (pos) {
            editor.replaceRange(finalContent, pos);
        } else {
            editor.replaceRange(finalContent, { line: editor.lastLine(), ch: 0 });
        }
        new Notice(`${chunks.length} chunks insérés dans la note active.`);
    }

    /**
     * Insère dans le fichier actif un tableau d'objets JSON (ex : documents vector store).
     * Chaque objet est cloné, la propriété 'embedding' est supprimée, puis inséré sous forme de bloc de code JSON, séparé par '---'.
     */
    insertJsonObjectsInActiveFile(objects: any[]): void {
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
        const finalContent = mdBlocks.join('\n\n---\n\n');
        const pos = editor.getCursor ? editor.getCursor() : undefined;
        if (pos) {
            editor.replaceRange(finalContent, pos);
        } else {
            editor.replaceRange(finalContent, { line: editor.lastLine(), ch: 0 });
        }
    }
}
