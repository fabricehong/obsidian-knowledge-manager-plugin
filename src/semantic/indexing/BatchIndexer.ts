/**
 * Service d'orchestration de l'indexation batch.
 * Travaille via les interfaces abstraites.
 */
import { Chunk } from "../../models/chunk";
import { ChunkTransformService } from "./ChunkTransformService";
import { VectorStore } from "../vector-store/VectorStore";

import { IndexableChunk } from './IndexableChunk';

export interface BatchIndexer {
  /**
   * Transforme un batch de chunks via une technique donnée.
   */
  transformBatch(
    chunks: Chunk[],
    technique: ChunkTransformService
  ): Promise<IndexableChunk[]>;
}

