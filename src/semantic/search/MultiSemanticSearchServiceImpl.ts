import { MultiSemanticSearchService, MultiSearchResult, SearchTarget } from './MultiSemanticSearchService';
import { SemanticSearchServiceImpl } from './SemanticSearchServiceImpl';
import { VectorStore } from '../vector-store/VectorStore';

/**
 * Implémentation concrète pour la multi-recherche sémantique sur plusieurs couples technique/vector store
 */
export class MultiSemanticSearchServiceImpl implements MultiSemanticSearchService {
  constructor(private vectorStores: { [key: string]: VectorStore }) {}

  async multiSearch(query: string, topK: number, targets: SearchTarget[]): Promise<MultiSearchResult> {
    const results: MultiSearchResult = {};
    await Promise.all(targets.map(async target => {
      const key = `${target.technique}_${target.vectorStore}`;
      const vectorStore = this.vectorStores[key];
      if (!vectorStore) return;
      const service = new SemanticSearchServiceImpl(vectorStore);
      results[key] = await service.search(query, topK, key);
    }));
    return results;
  }
}
