import { VectorStore } from '../vector-store/VectorStore';
import { BatchChunkTransformResult } from './MultiTechniqueIndexerImpl';

export interface BatchIndexableChunkIndexer {
  /**
   * Indexe les IndexableChunk pour chaque technique dans tous les vector stores fournis.
   * @param transformedChunks Mapping {technique: IndexableChunk[]}
   * @param vectorStores Liste des vector stores cibles
   */
  indexTransformedChunks(
    transformedChunks: BatchChunkTransformResult,
    vectorStores: VectorStore[]
  ): Promise<void>;
}
