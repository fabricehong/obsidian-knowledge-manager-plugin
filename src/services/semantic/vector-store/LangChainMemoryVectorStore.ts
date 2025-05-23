import { VectorStore, IndexableChunk } from './VectorStore';
import { VectorStoreType } from './VectorStoreType';
import { SearchResult } from '../search/SemanticSearchService';
import { Chunk } from '../../../models/chunk';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';

// Cette classe wrappe MemoryVectorStore de LangChain pour l'API du projet
export class LangChainMemoryVectorStore implements VectorStore {
  readonly type = VectorStoreType.MEMORY;
  private store: MemoryVectorStore;

  constructor(embeddingsProvider?: any) {
    this.store = new MemoryVectorStore(embeddingsProvider);
  }

  async indexBatch(chunks: IndexableChunk[], collection: string) {
    if (!chunks.length) return;
    const docs = chunks.map(chunk => ({
      pageContent: chunk.pageContent,
      metadata: { ...chunk.chunk, technique: chunk.technique, collection }
    }));
    await this.store.addDocuments(docs);
  }

  async search(query: string, topK: number, collection: string): Promise<SearchResult[]> {
    const results = await this.store.similaritySearch(query, topK);
    return results.map((r: any) => ({
      chunk: r.metadata as Chunk,
      score: r.score || 1 // Adapter si LangChain fournit un score
    }));
  }

  /**
   * Retourne tous les documents enregistrés dans le vector store mémoire.
   */
  public getAllDocuments(): any[] {
    // Selon la version de LangChain, la propriété peut s'appeler memoryVectors ou documents
    if ((this.store as any).memoryVectors) {
      return (this.store as any).memoryVectors;
    }
    if ((this.store as any).documents) {
      return (this.store as any).documents;
    }
    return [];
  }
}
