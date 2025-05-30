import { Chunk } from "../../../models/chunk";
import { ChunkTransformService } from "./ChunkTransformService";
import { ChunkTransformTechnique } from "./ChunkTransformTechnique";
import { IndexableChunk } from "./IndexableChunk";

/**
 * Transformation qui indexe le markdown du chunk tel quel (RAW_TEXT)
 */
export class RawTextChunkTransformService implements ChunkTransformService {
  readonly technique = ChunkTransformTechnique.RAW_TEXT;

  transform(chunk: Chunk): IndexableChunk {
    return {
      chunk,
      pageContent: chunk.markdown.trim(),
      technique: this.technique
    };
  }
}
