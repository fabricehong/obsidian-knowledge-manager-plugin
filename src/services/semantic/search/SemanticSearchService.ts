/**
 * Interface pour la recherche sémantique dans un vector store donné et une technique donnée.
 */
import { Chunk } from "../../../models/chunk";

export interface SearchResult {
  chunk: Chunk;
  score: number;
}

export interface SemanticSearchService {
  /**
   * Recherche sémantique dans une collection/vector store.
   * @param query requête textuelle
   * @param topK nombre de résultats
   * @param collection nom de la collection/namespace
   */
  search(query: string, topK: number, collection: string): Promise<SearchResult[]>;
}
