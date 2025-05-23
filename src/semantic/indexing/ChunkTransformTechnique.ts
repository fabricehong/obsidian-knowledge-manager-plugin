/**
 * Enum des techniques de transformation de chunk en texte indexable.
 * Utilisé pour identifier de façon stable chaque stratégie.
 */
export enum ChunkTransformTechnique {
  RAW_TEXT = "raw_text",
  WITH_METADATA = "with_metadata"
  // Ajouter d'autres techniques ici
}
