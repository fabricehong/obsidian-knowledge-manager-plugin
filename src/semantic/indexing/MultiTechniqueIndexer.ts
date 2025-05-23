/**
 * Service d'évaluation multi-techniques : indexe en parallèle toutes les combinaisons technique/vector store.
 */
import { Chunk } from "../../models/chunk";
import { ChunkTransformService } from "./ChunkTransformService";
import { VectorStore } from "../vector-store/VectorStore";

export interface MultiTechniqueEvaluator {
  /**
   * Orchestration de l'indexation multi-techniques/multi-stores.
   */
  evaluate(
    chunks: Chunk[],
    techniques: ChunkTransformService[],
    vectorStores: VectorStore[]
  ): Promise<void>;
}
