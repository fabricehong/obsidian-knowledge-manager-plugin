/**
 * Interface pour un backend vectoriel (Vector Store).
 * Permet d'indexer des objets (chunk + texte indexable) par batch.
 */
import { Chunk } from "../../../models/chunk";
import { VectorStoreType } from "./VectorStoreType";

export interface IndexableChunk {
  chunk: Chunk;
  pageContent: string;
  technique: any; // à typer selon le projet
}

export interface VectorStore {
  readonly type: VectorStoreType;
  /**
   * Indexe un batch d'objets dans une collection donnée.
   * @param items objets à indexer
   * @param collection nom de la collection/namespace
   */
  indexBatch(items: IndexableChunk[], collection: string): Promise<void>;

  /**
   * Recherche sémantique dans le vector store/collection
   */
  search(query: string, topK: number, collection: string): Promise<any[]>;
}
