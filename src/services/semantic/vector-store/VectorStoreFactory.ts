import { GenericMemoryVectorStore } from './GenericMemoryVectorStore';
import { OpenAIEmbeddings } from '@langchain/openai';

export function createVectorStore(embedModel: string): GenericMemoryVectorStore {
  return new GenericMemoryVectorStore(new OpenAIEmbeddings({ model: embedModel }));
}
