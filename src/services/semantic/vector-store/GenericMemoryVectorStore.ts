import { VectorStore, IndexableChunk } from './VectorStore';

import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Embeddings } from '@langchain/core/embeddings';

// Cette classe wrappe MemoryVectorStore de LangChain pour l'API du projet
export class GenericMemoryVectorStore implements VectorStore {
  /**
   * Réinitialise complètement le vector store (supprime tous les documents).
   */
  async reset(): Promise<void> {
    // MemoryVectorStore n'a pas de méthode clear, donc on réinstancie
    this.store = new MemoryVectorStore(this.embeddingsProvider);
  }
  public readonly id: string;
  private store: MemoryVectorStore;
  private embeddingsProvider: Embeddings;

  constructor(embeddingsProvider: Embeddings) {
    this.embeddingsProvider = embeddingsProvider;
    this.store = new MemoryVectorStore(embeddingsProvider);
    this.id = this.getModelName() || 'unknown-model';
  }

  async indexBatch(chunks: IndexableChunk[], collection: string) {
    if (!chunks.length) return;
    const docs = chunks.map(chunk => ({
      pageContent: chunk.pageContent,
      metadata: { ...chunk.chunk, technique: chunk.technique, collection }
    }));
    await this.store.addDocuments(docs);
  }

  async search(query: string, topK: number, collection: string): Promise<any[]> {
    // Filtre sur la collection dans les métadonnées
    const filter = (doc: any) => doc.metadata?.collection === collection;
    const results = await this.store.similaritySearch(query, topK, filter);
    return results.map((r: any) => ({
      chunk: r.metadata,
      score: r.score || 1
    }));
  }

  /**
   * Retourne tous les documents du vector store, ou uniquement ceux d'une collection si précisé.
   * @param collection : nom de la collection à filtrer
   */
  public getAllDocuments(collection: string): any[] {
    let docs: any[] = [];
    if ((this.store as any).memoryVectors) {
      docs = (this.store as any).memoryVectors;
    } else if ((this.store as any).documents) {
      docs = (this.store as any).documents;
    }
    return docs.filter(doc => doc.metadata?.collection === collection);
  }

  /**
   * Retourne la liste unique des collections présentes dans les documents du store.
   */
  public getAllCollections(): string[] {
    let docs: any[] = [];
    if ((this.store as any).memoryVectors) {
      docs = (this.store as any).memoryVectors;
    } else if ((this.store as any).documents) {
      docs = (this.store as any).documents;
    }
    const collections = docs
      .map(doc => doc.metadata?.collection)
      .filter((c, i, arr) => c && arr.indexOf(c) === i);
    return collections;
  }

  public getModelName(): string | undefined {
    if ('model' in this.embeddingsProvider) {
      // @ts-ignore
      return this.embeddingsProvider.model;
    }
    return this.embeddingsProvider?.constructor?.name;
  }
}

