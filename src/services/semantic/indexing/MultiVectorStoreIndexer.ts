import { VectorStore } from '../vector-store/VectorStore';
import { MultiTechniqueIndexableChunks } from './MultiTechniqueChunkTransformerImpl';

export class MultiVectorStoreIndexer {
  private readonly vectorStores: VectorStore[];

  constructor(vectorStores: VectorStore[]) {
    this.vectorStores = vectorStores;
  }

  private static readonly BATCH_SIZE = 200;

  async indexTransformedChunks(
    multiTechniqueIndexableChunks: MultiTechniqueIndexableChunks
  ): Promise<void> {
    // Pour chaque technique, pour chaque vector store, indexer les chunks par batchs séquentiels de 50
    for (const technique in multiTechniqueIndexableChunks) {
      const indexableChunks = multiTechniqueIndexableChunks[technique];
      for (const vectorStore of this.vectorStores) {
        for (let i = 0; i < indexableChunks.length; i += MultiVectorStoreIndexer.BATCH_SIZE) {
          const batch = indexableChunks.slice(i, i + MultiVectorStoreIndexer.BATCH_SIZE);
          console.log(`indexing batch ${i/MultiVectorStoreIndexer.BATCH_SIZE+1} (${batch.length} chunks) for technique ${technique}`);
          await vectorStore.indexBatch(batch, technique);
        }
      }
    }
  }
}
