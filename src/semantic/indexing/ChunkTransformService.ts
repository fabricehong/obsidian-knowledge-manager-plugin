/**
 * Interface pour un service de transformation de chunk en texte indexable.
 * Chaque implémentation correspond à une technique de transformation.
 */
import { Chunk } from "../../models/chunk";
import { ChunkTransformTechnique } from "./ChunkTransformTechnique";
import { IndexableChunk } from "./IndexableChunk";

export interface ChunkTransformService {
  /** Identifiant stable de la technique */
  readonly technique: ChunkTransformTechnique;
  /** Transforme un chunk en texte indexable */
  transform(chunk: Chunk): IndexableChunk;
}
