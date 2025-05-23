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
}
