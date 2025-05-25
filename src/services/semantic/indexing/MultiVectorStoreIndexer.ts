import { VectorStore } from '../vector-store/VectorStore';
import { MultiTechniqueIndexableChunks } from './MultiTechniqueChunkTransformer';

export class MultiVectorStoreIndexer {
  private readonly vectorStores: VectorStore[];

  constructor(vectorStores: VectorStore[]) {
    this.vectorStores = vectorStores;
  }

  private static readonly BATCH_SIZE = 200;

  /**
   * Indexe les chunks transformés pour chaque technique et chaque vector store, par batchs.
   * En cas d'erreur (chunk trop gros pour l'embedding), affiche les 10 plus gros chunks du batch.
   */
  async indexTransformedChunks(
    multiTechniqueIndexableChunks: MultiTechniqueIndexableChunks
  ): Promise<void> {
    for (const technique in multiTechniqueIndexableChunks) {
      const indexableChunks = multiTechniqueIndexableChunks[technique];
      for (const vectorStore of this.vectorStores) {
        for (let i = 0; i < indexableChunks.length; i += MultiVectorStoreIndexer.BATCH_SIZE) {
          const batch = indexableChunks.slice(i, i + MultiVectorStoreIndexer.BATCH_SIZE);
          const batchNumber = i / MultiVectorStoreIndexer.BATCH_SIZE + 1;
          console.log(`Indexing batch ${batchNumber} (${batch.length} chunks) for technique ${technique}`);

          try {
            await vectorStore.indexBatch(batch, technique);
          } catch (err) {
            this.logBatchIndexingError(batch, technique, batchNumber, err);
            throw err;
          }
        }
      }
    }
  }

  /**
   * Loggue une erreur d'indexation de batch en affichant les 10 plus gros chunks.
   */
  private logBatchIndexingError(
    batch: { pageContent?: string }[],
    technique: string,
    batchNumber: number,
    err: unknown
  ) {
    // Trie les chunks par taille décroissante
    const sortedBatch = [...batch].sort((a, b) => {
      const aLen = a.pageContent?.length || 0;
      const bLen = b.pageContent?.length || 0;
      return bLen - aLen;
    });
    const top10 = sortedBatch.slice(0, 10);
    console.error(`Erreur lors de l'indexation du batch (technique: ${technique}, batch #${batchNumber}) : ${(err as Error)?.message || err}`);
    console.error('Les 10 plus gros chunks du batch (par taille décroissante) :');
    top10.forEach((chunk, idx) => {
      const size = chunk.pageContent?.length || 0;
      const preview = chunk.pageContent?.slice(0, 200)?.replace(/\n/g, ' ') || '';
      console.error(`#${idx + 1} - Taille: ${size} | Début: "${preview}${size > 200 ? '...' : ''}"`);
    });
  }
}
