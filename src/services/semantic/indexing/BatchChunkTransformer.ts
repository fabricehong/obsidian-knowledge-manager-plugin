/**
 * Service d'orchestration de l'indexation batch.
 * Travaille via les interfaces abstraites.
 */
import { Chunk } from "../../../models/chunk";
import { ChunkTransformService } from "./ChunkTransformService";
import { VectorStore } from "../vector-store/VectorStore";

import { IndexableChunk } from './IndexableChunk';

export interface BatchChunkTransformer {
  /**
   * Transforme un batch de chunks en IndexableChunk[] via une technique donnée.
   */
  transformBatchToIndexableChunks(
    chunks: Chunk[],
    technique: ChunkTransformService
  ): Promise<IndexableChunk[]>;
}

