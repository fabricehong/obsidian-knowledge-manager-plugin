import { ContextualizedChunkTransformService } from './ContextualizedChunkTransformService';
import { Chunk, ChunkHierarchyType } from '../../models/chunk';

describe('ContextualizedChunkTransformService', () => {
  const service = new ContextualizedChunkTransformService();

  it('doit formatter un chunk avec contexte hiérarchique et markdown', () => {
    const chunk: Chunk = {
      markdown: 'Ceci est le contenu du chunk.',
      hierarchy: [
        { name: 'Notes', type: ChunkHierarchyType.Directory },
        { name: 'ProjetX', type: ChunkHierarchyType.Directory },
        { name: 'FichierImportant', type: ChunkHierarchyType.File },
        { name: 'Introduction', type: ChunkHierarchyType.Header },
        { name: 'Détail', type: ChunkHierarchyType.Header }
      ]
    };
    const expected =
      '[Path] Notes > ProjetX > FichierImportant.md > # Introduction > ## Détail\n\n[Content]\nCeci est le contenu du chunk.';
    const result = service.transform(chunk);
    expect(result.pageContent).toBe(expected);
    expect(result.chunk).toBe(chunk);
    expect(result.technique).toBe(service.technique);
  });

  it('gère les chunks sans header', () => {
    const chunk: Chunk = {
      markdown: 'Sans header.',
      hierarchy: [
        { name: 'Notes', type: ChunkHierarchyType.Directory },
        { name: 'Fichier', type: ChunkHierarchyType.File }
      ]
    };
    const expected = '[Path] Notes > Fichier.md\n\n[Content]\nSans header.';
    const result = service.transform(chunk);
    expect(result.pageContent).toBe(expected);
    expect(result.chunk).toBe(chunk);
    expect(result.technique).toBe(service.technique);
  });
});
