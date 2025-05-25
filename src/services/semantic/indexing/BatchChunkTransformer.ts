import { Chunk } from '../../../models/chunk';
import { ChunkTransformService } from './ChunkTransformService';
import { IndexableChunk } from './IndexableChunk';

/**
 * Implémentation concrète de BatchChunkTransformer pour orchestrer la transformation de batch de chunks en IndexableChunk[]
 */
// Pour la prochaine étape :
// export type BatchChunkTransformResult = Record<ChunkTransformTechnique, IndexableChunk[]>;

export class BatchChunkTransformer {
  // private static readonly MAX_CHUNK_LENGTH = 8000;
  private static readonly MAX_CHUNK_LENGTH = 10340;

  async transformBatchToIndexableChunks(
    chunks: Chunk[],
    technique: ChunkTransformService
  ): Promise<IndexableChunk[]> {
    // Transforme les chunks en texte indexable
    const indexableChunks: IndexableChunk[] = await Promise.all(
      chunks.map(async (chunk) => {
        const transformed = await technique.transform(chunk);
        return transformed;
      })
    );

    // Vérification des tailles
    for (const item of indexableChunks) {
      if (item.pageContent.length > BatchChunkTransformer.MAX_CHUNK_LENGTH) {
        let crumbPath = '';
        if (item.chunk && item.chunk.hierarchy && Array.isArray(item.chunk.hierarchy)) {
          crumbPath = item.chunk.hierarchy.map((h: any) => h.name).join(' > ');
        }
        console.error('[Embedding][Chunk trop grand]', {
          technique: technique.constructor?.name,
          crumbPath,
          length: item.pageContent.length,
          content: item.pageContent
        });
        // @ts-ignore
        new window.Notice(`Chunk trop grand (${BatchChunkTransformer.MAX_CHUNK_LENGTH}c): ${crumbPath}`);
        throw new Error(`Chunk trop grand (${BatchChunkTransformer.MAX_CHUNK_LENGTH}c) pour la technique ${technique.constructor?.name}, chemin: ${crumbPath}`);
      }
    }

    return indexableChunks;
  }
}

