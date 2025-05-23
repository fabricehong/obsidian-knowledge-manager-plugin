import { Chunk } from "../../models/chunk";
import { ChunkTransformService } from "./ChunkTransformService";
import { ChunkTransformTechnique } from "./ChunkTransformTechnique";
import { IndexableChunk } from "./IndexableChunk";

/**
 * Transformation qui enrichit le markdown du chunk avec son contexte hiérarchique lisible.
 * Format :
 * [Path] dossier1 > dossier2 > fichier.md > # header1 > ## header2
 * [Content]
 * <markdown>
 */
export class ContextualizedChunkTransformService implements ChunkTransformService {
  readonly technique = ChunkTransformTechnique.WITH_METADATA;

  transform(chunk: Chunk): IndexableChunk {
    const path = chunk.hierarchy
      .map((level, i) => {
        switch (level.type) {
          case "directory":
            return level.name;
          case "file":
            return level.name + ".md";
          case "header":
            const headerDepth = chunk.hierarchy.slice(0, i + 1).filter(l => l.type === "header").length;
            return "#".repeat(headerDepth) + " " + level.name;
          default:
            return level.name;
        }
      })
      .join(" > ");
    return {
      chunk,
      pageContent: `[Path] ${path}\n\n[Content]\n${chunk.markdown.trim()}`,
      technique: this.technique
    };
  }
}
