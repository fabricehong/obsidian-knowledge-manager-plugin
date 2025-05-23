import { Chunk } from '../../../models/chunk';
import { ChunkTransformService } from './ChunkTransformService';
import { VectorStore } from '../vector-store/VectorStore';
import { IndexableChunk } from './IndexableChunk';
import { BatchIndexer } from './BatchIndexer';

/**
 * Implémentation concrète de BatchIndexer pour orchestrer la transformation et l'indexation
 */
// Pour la prochaine étape :
// export type BatchChunkTransformResult = Record<ChunkTransformTechnique, IndexableChunk[]>;

export class BatchIndexerImpl implements BatchIndexer {
  async transformBatch(
    chunks: Chunk[],
    technique: ChunkTransformService
  ): Promise<IndexableChunk[]> {
    // Transforme les chunks en texte indexable
    const indexableChunks: IndexableChunk[] = await Promise.all(
      chunks.map(async (chunk) => {
        const transformed = await technique.transform(chunk);
        return transformed;
      })
    );
    return indexableChunks;
  }
}

