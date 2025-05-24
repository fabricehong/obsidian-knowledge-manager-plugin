import { Chunk } from '../../../models/chunk';
import { ChunkTransformService } from './ChunkTransformService';
import { VectorStore } from '../vector-store/VectorStore';
import { IndexableChunk } from './IndexableChunk';
import { BatchChunkTransformer } from './BatchChunkTransformer';

/**
 * Implémentation concrète de BatchChunkTransformer pour orchestrer la transformation de batch de chunks en IndexableChunk[]
 */
// Pour la prochaine étape :
// export type BatchChunkTransformResult = Record<ChunkTransformTechnique, IndexableChunk[]>;

export class BatchChunkTransformerImpl implements BatchChunkTransformer {
  async transformBatchToIndexableChunks(
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

