import { Chunk } from '../../../models/chunk';
import { ChunkTransformService } from './ChunkTransformService';
import { VectorStore } from '../vector-store/VectorStore';
import { MultiTechniqueEvaluator } from './MultiTechniqueIndexer';
import { BatchIndexerImpl } from './BatchIndexerImpl';
import { IndexableChunk } from './IndexableChunk';

// Nouveau type pour le mapping multi-technique
export type BatchChunkTransformResult = Record<string, IndexableChunk[]>;

/**
 * Implémentation concrète de MultiTechniqueEvaluator pour indexer toutes les combinaisons
 */
export class MultiTechniqueIndexerImpl implements MultiTechniqueEvaluator {
  private batchIndexer = new BatchIndexerImpl();

  async transformAllTechniques(
    chunks: Chunk[],
    techniques: ChunkTransformService[]
  ): Promise<BatchChunkTransformResult> {
    const result: BatchChunkTransformResult = {};
    for (const technique of techniques) {
      result[technique.technique] = await this.batchIndexer.transformBatch(chunks, technique);
    }
    return result;
  }

  // L'indexation batch multi-vector store sera déléguée à un nouveau service dans l'étape suivante.
}
