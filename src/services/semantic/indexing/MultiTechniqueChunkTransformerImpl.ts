import { Chunk } from '../../../models/chunk';
import { ChunkTransformService } from './ChunkTransformService';
import { MultiTechniqueChunkTransformer } from './MultiTechniqueChunkTransformer';
import { BatchChunkTransformerImpl } from './BatchChunkTransformerImpl';
import { IndexableChunk } from './IndexableChunk';

// Nouveau type pour le mapping multi-technique
export type BatchChunkTransformResult = Record<string, IndexableChunk[]>;

/**
 * Implémentation concrète de MultiTechniqueEvaluator pour indexer toutes les combinaisons
 */
export class MultiTechniqueChunkTransformerImpl implements MultiTechniqueChunkTransformer {
  private batchChunkTransformer = new BatchChunkTransformerImpl();

  async transformAllTechniquesToIndexableChunks(
    chunks: Chunk[],
    techniques: ChunkTransformService[]
  ): Promise<BatchChunkTransformResult> {
    const result: BatchChunkTransformResult = {};
    for (const technique of techniques) {
      result[technique.technique] = await this.batchChunkTransformer.transformBatchToIndexableChunks(chunks, technique);
    }
    return result;
  }

  // L'indexation batch multi-vector store sera déléguée à un nouveau service dans l'étape suivante.
}
