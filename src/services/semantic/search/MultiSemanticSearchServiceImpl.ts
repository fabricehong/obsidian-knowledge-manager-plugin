import { MultiSemanticSearchService, MultiSearchResult, SearchTarget } from './MultiSemanticSearchService';
import { SemanticSearchServiceImpl } from './SemanticSearchServiceImpl';
import { VectorStore } from '../vector-store/VectorStore';
import { getVectorStoreLabel } from '../vector-store/vectorStoreLabel';

/**
 * Implémentation concrète pour la multi-recherche sémantique sur plusieurs couples technique/vector store
 */
export class MultiSemanticSearchServiceImpl implements MultiSemanticSearchService {
  constructor(private vectorStores: { [key: string]: VectorStore }) {}

  async multiSearch(query: string, topK: number, targets: SearchTarget[]): Promise<MultiSearchResult> {
    const results: MultiSearchResult = {};
    await Promise.all(targets.map(async target => {
      const vectorStore = target.vectorStoreInstance;
      const key = target.vectorStoreKey;
      const label = getVectorStoreLabel(vectorStore);
      if (typeof (vectorStore as any).getAllDocuments === 'function') {
        const nbDocs = (vectorStore as any).getAllDocuments().length;
        console.log(`[SemanticSearch] Recherche en cours sur vector store : ${label} [${key}]` + (nbDocs !== undefined ? ` | Documents présents : ${nbDocs}` : ''));
      } else {
        console.log(`[SemanticSearch] Recherche en cours sur vector store : ${label} [${key}]`);
      }
      console.log(`[SemanticSearch] Recherche sur collection : ${target.technique}`);
      const service = new SemanticSearchServiceImpl(vectorStore);
      const searchResults = await service.search(query, topK, target.technique);
      console.log(`[SemanticSearch] Résultats pour ${label} [${key}] (collection ${target.technique}) :`, searchResults.length, searchResults);
      results[key] = searchResults;
    }));
    return results;
  }
}
