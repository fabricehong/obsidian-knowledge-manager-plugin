import { App, Notice } from 'obsidian';
import { EditorChunkingService } from './editor-chunking.service';
import { MultiTechniqueChunkTransformer } from './indexing/MultiTechniqueChunkTransformer';
import { VectorStore } from './vector-store/VectorStore';
import { IndexableChunk } from './indexing/IndexableChunk';

export class EditorChunkIndexingService {
    private app: App;
    private editorChunkingService: EditorChunkingService;
    private multiTechniqueChunkTransformer: MultiTechniqueChunkTransformer;
    private vectorStores: VectorStore[];

    constructor(app: App, editorChunkingService: EditorChunkingService, multiTechniqueChunkTransformer: MultiTechniqueChunkTransformer, vectorStores: VectorStore[]) {
        this.app = app;
        this.editorChunkingService = editorChunkingService;
        this.multiTechniqueChunkTransformer = multiTechniqueChunkTransformer;
        this.vectorStores = vectorStores;
    }

    /**
     * Découpe le fichier actif en chunks, applique toutes les techniques, puis indexe chaque chunk individuellement.
     */
    async indexActiveFileChunksIndividually() {
        const chunks = await this.editorChunkingService.getChunksFromActiveFile();
        if (!chunks.length) {
            new Notice('Aucun chunk généré à partir du fichier actif.');
            return;
        }
        const transformed = await this.multiTechniqueChunkTransformer.transformAllTechniquesToIndexableChunks(chunks);
        let total = 0;
        for (const technique in transformed) {
            const indexableChunks = transformed[technique];
            for (const chunk of indexableChunks) {
                for (const vectorStore of this.vectorStores) {
                    await vectorStore.indexBatch([chunk], technique); // indexation unitaire
                    total++;
                }
            }
        }
        new Notice(`Indexation individuelle terminée (${total} chunks indexés).`);
    }
}
