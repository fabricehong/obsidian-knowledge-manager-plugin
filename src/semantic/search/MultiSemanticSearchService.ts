/**
 * Service de multi-recherche sémantique (comparaison de résultats sur plusieurs combinaisons).
 */
import { ChunkTransformTechnique } from "../chunk-transform/ChunkTransformTechnique";
import { VectorStoreType } from "../vector-store/VectorStoreType";
import { SearchResult } from "./SemanticSearchService";

export interface SearchTarget {
  technique: ChunkTransformTechnique;
  vectorStore: VectorStoreType;
}

export interface MultiSearchResult {
  [targetKey: string]: SearchResult[];
}

export interface MultiSemanticSearchService {
  /**
   * Lance la recherche sur plusieurs couples technique/vector store.
   */
  multiSearch(
    query: string,
    topK: number,
    targets: SearchTarget[]
  ): Promise<MultiSearchResult>;
}
