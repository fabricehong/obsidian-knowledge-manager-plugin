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

    /**
     * Pour chaque vector store et chaque technique, tente de générer les embeddings pour chaque chunk.
     * Log les erreurs éventuelles sans retourner les embeddings.
     */
    async testEmbeddingsForActiveFileChunksAllStores() {
        const chunks = await this.editorChunkingService.getChunksFromActiveFile();
        if (!chunks.length) {
            new Notice('Aucun chunk généré à partir du fichier actif.');
            return;
        }
        const transformed = await this.multiTechniqueChunkTransformer.transformAllTechniquesToIndexableChunks(chunks);
        const errors: {
            vectorStore: string,
            technique: string,
            chunkPath: string,
            chunk: any,
            error: any,
            pageContentLength: number
        }[] = [];

        for (const vectorStore of this.vectorStores) {
            // @ts-ignore (embeddingsProvider n'est pas dans VectorStore interface)
            const embeddingsProvider = vectorStore.embeddingsProvider;
            if (!embeddingsProvider) {
                console.warn(`[Embedding][${vectorStore.id}] Pas d'embeddingsProvider pour ce vector store.`);
                continue;
            }
            for (const technique in transformed) {
                const indexableChunks = transformed[technique];
                try {
                    await embeddingsProvider.embedDocuments(indexableChunks.map(c => c.pageContent));
                } catch (error) {
                    for (const chunk of indexableChunks) {
                        let crumbPath = '';
                        if (chunk.chunk && chunk.chunk.hierarchy && Array.isArray(chunk.chunk.hierarchy)) {
                            crumbPath = chunk.chunk.hierarchy.map((h: any) => h.name).join(' > ');
                        }
                        errors.push({
                            vectorStore: vectorStore.id,
                            technique,
                            chunkPath: crumbPath,
                            chunk,
                            error,
                            pageContentLength: chunk.pageContent?.length || 0
                        });
                    }
                }
            }
        }

        if (errors.length === 0) {
            new Notice('Test embedding terminé : aucune erreur détectée 🎉');
        } else {
            new Notice(`Test embedding terminé : ${errors.length} erreur(s) détectée(s) (voir la console pour le détail).`);
            console.error('[Embedding][Erreurs totales]', errors);
            errors.forEach(e => {
                console.error(
                    `[Embedding][Erreur] VectorStore: ${e.vectorStore}, Technique: ${e.technique}, Chemin: ${e.chunkPath}, Taille pageContent: ${e.pageContentLength}`,
                    e.error
                );
            });
        }

    }
}
