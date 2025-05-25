/**
 * Service de multi-recherche sémantique (comparaison de résultats sur plusieurs combinaisons).
 */
import { SearchResult } from "./SemanticSearchService";



export interface MultiSearchResult {
  [targetKey: string]: SearchResult[];
}

export interface MultiSemanticSearchService {
  /**
   * Lance la recherche sur toutes les techniques et tous les vector stores disponibles
   * et retourne les résultats groupés par combinaison.
   */
  searchEverywhere(
    query: string,
    topK: number
  ): Promise<MultiSearchResult>;
}


