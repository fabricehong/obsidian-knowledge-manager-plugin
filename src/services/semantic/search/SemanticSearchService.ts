import { VectorStore } from '../vector-store/VectorStore';
import { Chunk } from '../../../models/chunk';

export interface SearchResult {
  chunk: Chunk;
  score: number;
}

/**
 * Implémentation concrète du service de recherche sémantique via un VectorStore
 */
export class SemanticSearchService {
  public readonly vectorStore: VectorStore;
  constructor(vectorStore: VectorStore) {
    this.vectorStore = vectorStore;
  }

  logSearchContext(collection: string): void {
    if (typeof this.vectorStore.getAllDocuments === 'function') {
      const nbDocs = this.vectorStore.getAllDocuments(collection).length;
      console.log(`[SemanticSearch] Recherche en cours sur vector store : ${this.vectorStore.id} [${collection}]` + (nbDocs !== undefined ? ` | Documents présents : ${nbDocs}` : ''));
    } else {
      console.log(`[SemanticSearch] Recherche en cours sur vector store : ${this.vectorStore.id} [${collection}]`);
    }
  }

  async search(query: string, topK: number, collection: string): Promise<SearchResult[]> {
    // Recherche via le vector store
    const results: any[] = await this.vectorStore.search(query, topK, collection);
    // Adapter le format si nécessaire (si déjà SearchResult, retourne tel quel)
    if (results.length && results[0].chunk && typeof results[0].score === 'number') {
      return results as SearchResult[];
    }
    return results.map((r: any) => ({ chunk: r.metadata as Chunk, score: r.score }));
  }
}
