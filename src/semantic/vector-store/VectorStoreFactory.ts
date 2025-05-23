import { VectorStoreType } from './VectorStoreType';
import { LangChainMemoryVectorStore } from './LangChainMemoryVectorStore';
import { VectorStore } from './VectorStore';

export function createVectorStore(type: VectorStoreType, embedModel: string): VectorStore {
  switch (type) {
    case VectorStoreType.MEMORY:
      return new LangChainMemoryVectorStore(embedModel);
    // case VectorStoreType.FAISS:
    //   return new Pa''sVectorStore(embedModel);
    default:
      throw new Error('VectorStoreType not supported: ' + type);
  }
}
