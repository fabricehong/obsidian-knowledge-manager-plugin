import { VectorStore } from '../vector-store/VectorStore';
import { Chunk } from '../../../models/chunk';
import { SearchResult } from 'obsidian';
import { SemanticSearchService } from './SemanticSearchService';

/**
 * Implémentation concrète du service de recherche sémantique via un VectorStore
 */
export class ChatSemanticSearchService {
  constructor(private semanticSearchService: SemanticSearchService, private readonly collection: string) {}

  async search(query: string, topK: number): Promise<SearchResult[]> {
    const results = await this.semanticSearchService.search(query, topK, this.collection);
    return results.map((r: any) => ({ chunk: r.metadata as Chunk, score: r.score, matches: r.matches }));
  }
}
