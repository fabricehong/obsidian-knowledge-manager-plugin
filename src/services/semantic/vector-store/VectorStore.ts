/**
 * Interface pour un backend vectoriel (Vector Store).
 * Permet d'indexer des objets (chunk + texte indexable) par batch.
 */
import { Chunk } from "../../../models/chunk";
import { SearchResult } from "../search/SemanticSearchService";


export interface IndexableChunk {
  chunk: Chunk;
  pageContent: string;
  technique: any; // à typer selon le projet
}

export interface VectorStore {
  init?(): Promise<void>;
  /**
   * Réinitialise complètement le vector store (supprime tous les documents).
   */
  reset(): Promise<void>;
  getAllCollections(): string[];
  readonly id: string;
  /**
   * Indexe un batch d'objets dans une collection donnée.
   * @param items objets à indexer
   * @param collection nom de la collection/namespace
   */
  indexBatch(items: IndexableChunk[], collection: string): Promise<void>;

  /**
   * Recherche sémantique dans le vector store/collection
   */
  search(query: string, topK: number, collection: string): Promise<SearchResult[]>;

  /**
   * Retourne tous les documents du vector store, ou uniquement ceux d'une collection si précisé.
   * @param collection : nom de la collection à filtrer
   */
  getAllDocuments(collection: string): any[];
}
