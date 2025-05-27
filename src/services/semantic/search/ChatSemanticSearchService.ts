import { SearchResult, SemanticSearchService } from './SemanticSearchService';

/**
 * Implémentation concrète du service de recherche sémantique via un VectorStore
 */
export class ChatSemanticSearchService {
  constructor(private semanticSearchService: SemanticSearchService, private readonly collection: string) {}

  async search(query: string, topK: number): Promise<SearchResult[]> {
    console.log(`[ChatSemanticSearchService] Recherche sur collection : ${this.collection}`);
    const results = await this.semanticSearchService.search(query, topK, this.collection);
    return results;
  }
}
