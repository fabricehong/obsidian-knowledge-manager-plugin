import { SemanticSearchService, SearchResult } from './SemanticSearchService';
import { VectorStore } from '../vector-store/VectorStore';
import { Chunk } from '../../../models/chunk';

/**
 * Implémentation concrète du service de recherche sémantique via un VectorStore
 */
export class SemanticSearchServiceImpl implements SemanticSearchService {
  constructor(private vectorStore: VectorStore) {}

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
