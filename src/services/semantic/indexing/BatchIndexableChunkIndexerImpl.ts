import { VectorStore } from '../vector-store/VectorStore';
import { BatchIndexableChunkIndexer } from './BatchIndexableChunkIndexer';
import { BatchChunkTransformResult } from './MultiTechniqueChunkTransformerImpl';

export class BatchIndexableChunkIndexerImpl implements BatchIndexableChunkIndexer {
  async indexTransformedChunks(
    transformedChunks: BatchChunkTransformResult,
    vectorStores: VectorStore[]
  ): Promise<void> {
    // Pour chaque technique, pour chaque vector store, indexer le batch dans la collection dédiée
    const tasks: Promise<void>[] = [];
    for (const technique in transformedChunks) {
      const indexableChunks = transformedChunks[technique];
      for (const vectorStore of vectorStores) {
        // Le nom de la collection/namespace est dérivé de la technique
        tasks.push(vectorStore.indexBatch(indexableChunks, technique));
      }
    }
    await Promise.all(tasks);
  }
}
