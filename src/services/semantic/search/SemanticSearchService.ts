import { VectorStore } from '../vector-store/VectorStore';
import { Chunk } from '../../../models/chunk';

export interface SearchResult {
  chunk: {id?: string, pageContent?: string, metadata?: ChunkMetadata}; // Le chunk trouvé, avec ses métadonnées
  score: number;
}

export interface ChunkMetadata {
    collection: string; // Nom de la collection/namespace
    filepath?: string; // Chemin du fichier source (si applicable)
    header?: string; // Header du chunk (si applicable)
    order?: number; // Ordre du chunk dans le fichier (si applicable)
}

/**
 * Implémentation concrète du service de recherche sémantique via un VectorStore
 */
export class SemanticSearchService {
  public readonly vectorStore: VectorStore;
  constructor(vectorStore: VectorStore) {
    this.vectorStore = vectorStore;
  }

  logSearchContext(collection: string): void {
    if (typeof this.vectorStore.getAllDocuments === 'function') {
      const nbDocs = this.vectorStore.getAllDocuments(collection).length;
      console.log(`[SemanticSearch] Recherche en cours sur vector store : ${this.vectorStore.id} [${collection}]` + (nbDocs !== undefined ? ` | Documents présents : ${nbDocs}` : ''));
    } else {
      console.log(`[SemanticSearch] Recherche en cours sur vector store : ${this.vectorStore.id} [${collection}]`);
    }
  }

  async search(query: string, topK: number, collection: string): Promise<SearchResult[]> {
    // Recherche via le vector store
    const results: SearchResult[] = await this.vectorStore.search(query, topK, collection);
    return results;
  }
}
