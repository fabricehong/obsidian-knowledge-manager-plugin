import { Chunk } from '../../models/chunk';
import { ChunkTransformTechnique } from './ChunkTransformTechnique';

/**
 * Un chunk transformé en texte indexable, prêt à être vectorisé/indexé.
 */
export interface IndexableChunk {
  chunk: Chunk;
  pageContent: string; // pour papa-ts, correspond au texte à embedder
  technique: ChunkTransformTechnique;
}
