/**
 * Service d'orchestration de l'indexation batch.
 * Travaille via les interfaces abstraites.
 */
import { Chunk } from "../../models/chunk";
import { ChunkTransformService } from "./ChunkTransformService";
import { VectorStore } from "../vector-store/VectorStore";

export interface BatchIndexer {
  /**
   * Transforme et indexe un batch de chunks via une technique et un vector store donnés.
   */
  indexBatch(
    chunks: Chunk[],
    technique: ChunkTransformService,
    vectorStore: VectorStore
  ): Promise<void>;
}
