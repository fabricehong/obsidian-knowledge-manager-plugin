/**
 * Service d'évaluation multi-techniques : indexe en parallèle toutes les combinaisons technique/vector store.
 */
import { Chunk } from "../../models/chunk";
import { ChunkTransformService } from "./ChunkTransformService";
import { VectorStore } from "../vector-store/VectorStore";
import { IndexableChunk } from './IndexableChunk';

export type BatchChunkTransformResult = Record<string, IndexableChunk[]>;

export interface MultiTechniqueEvaluator {
  /**
   * Orchestration de l'indexation multi-techniques/multi-stores.
   */
  transformAllTechniques(
    chunks: Chunk[],
    techniques: ChunkTransformService[]
  ): Promise<BatchChunkTransformResult>;
}
