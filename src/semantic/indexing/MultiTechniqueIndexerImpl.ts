import { Chunk } from '../../models/chunk';
import { ChunkTransformService } from './ChunkTransformService';
import { VectorStore } from '../vector-store/VectorStore';
import { MultiTechniqueEvaluator } from './MultiTechniqueIndexer';
import { BatchIndexerImpl } from './BatchIndexerImpl';

/**
 * Implémentation concrète de MultiTechniqueEvaluator pour indexer toutes les combinaisons
 */
export class MultiTechniqueIndexerImpl implements MultiTechniqueEvaluator {
  private batchIndexer = new BatchIndexerImpl();

  async indexBatch(
    chunks: Chunk[],
    techniques: ChunkTransformService[],
    vectorStores: VectorStore[]
  ): Promise<void> {
    // Pour chaque combinaison technique/store, indexer en parallèle
    const tasks: Promise<void>[] = [];
    for (const technique of techniques) {
      for (const vectorStore of vectorStores) {
        tasks.push(
          this.batchIndexer.indexBatch(chunks, technique, vectorStore)
        );
      }
    }
    await Promise.all(tasks);
  }
}
