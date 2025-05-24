import { VectorStore, IndexableChunk } from './VectorStore';
import { VectorStoreType } from './VectorStoreType';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';

export class OllamaMemoryVectorStore implements VectorStore {
  readonly type = VectorStoreType.OLLAMA;
  private store: MemoryVectorStore;
  private model: string;

  constructor(model: string) {
    this.model = model;
    const embeddings = new OllamaEmbeddings({ model });
    this.store = new MemoryVectorStore(embeddings);
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
    const results = await this.store.similaritySearch(query, topK);
    return results.map((r: any) => ({
      chunk: r.metadata,
      score: r.score || 1
    }));
  }

  public getAllDocuments(): any[] {
    if ((this.store as any).memoryVectors) {
      return (this.store as any).memoryVectors;
    }
    if ((this.store as any).documents) {
      return (this.store as any).documents;
    }
    return [];
  }

  public getModelName(): string {
    return this.model;
  }
}
