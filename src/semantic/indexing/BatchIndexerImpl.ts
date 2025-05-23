import { Chunk } from '../../models/chunk';
import { ChunkTransformService } from './ChunkTransformService';
import { VectorStore } from '../vector-store/VectorStore';
import { IndexableChunk } from './IndexableChunk';
import { BatchIndexer } from './BatchIndexer';

/**
 * Implémentation concrète de BatchIndexer pour orchestrer la transformation et l'indexation
 */
export class BatchIndexerImpl implements BatchIndexer {
  async indexBatch(
    chunks: Chunk[],
    technique: ChunkTransformService,
    vectorStore: VectorStore
  ): Promise<void> {
    // Transforme les chunks en texte indexable
    const indexableChunks: IndexableChunk[] = await Promise.all(
      chunks.map(async (chunk) => {
        const transformed = await technique.transform(chunk);
        return transformed;
      })
    );
    // Indexe le batch dans le vector store
    const collection = technique.technique; // ou nommage explicite si besoin
    await vectorStore.indexBatch(indexableChunks, collection);
  }
}
