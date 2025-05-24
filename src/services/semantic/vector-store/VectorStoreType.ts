/**
 * Enum des types de Vector Store supportés.
 */
export enum VectorStoreType {
  MEMORY = 'MEMORY',
  OLLAMA = 'OLLAMA',
  PINECONE = "pinecone",
  QDRANT = "qdrant",
  FAISS = "faiss"
  // Ajouter d'autres stores ici
}
