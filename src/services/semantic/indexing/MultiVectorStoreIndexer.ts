import { VectorStore } from '../vector-store/VectorStore';
import { MultiTechniqueIndexableChunks } from './MultiTechniqueChunkTransformerImpl';

export class MultiVectorStoreIndexer {
  private readonly vectorStores: VectorStore[];

  constructor(vectorStores: VectorStore[]) {
    this.vectorStores = vectorStores;
  }

  async indexTransformedChunks(
    multiTechniqueIndexableChunks: MultiTechniqueIndexableChunks
  ): Promise<void> {
    // Pour chaque technique, pour chaque vector store, indexer le batch dans la collection dédiée
    const tasks: Promise<void>[] = [];
    for (const technique in multiTechniqueIndexableChunks) {
      const indexableChunks = multiTechniqueIndexableChunks[technique];
      for (const vectorStore of this.vectorStores) {
        // Le nom de la collection/namespace est dérivé de la technique
        console.log(`indexing ${indexableChunks.length} chunks for technique ${technique}`);
        tasks.push(vectorStore.indexBatch(indexableChunks, technique));
      }
    }
    await Promise.all(tasks);
  }
}
