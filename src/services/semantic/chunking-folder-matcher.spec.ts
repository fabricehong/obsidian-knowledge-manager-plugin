import { isFileInChunkingFolder } from './chunking-folder-matcher';

describe('isFileInChunkingFolder', () => {
    it('match exact folder', () => {
        expect(isFileInChunkingFolder('notes/projets/test.md', 'notes/projets')).toBe(true);
    });
    it('match file in subfolder', () => {
        expect(isFileInChunkingFolder('notes/projets/sous/test.md', 'notes/projets')).toBe(true);
    });
    it('does not match outside folder', () => {
        expect(isFileInChunkingFolder('notes/autre/test.md', 'notes/projets')).toBe(false);
    });
    it('match with trailing slash in folder', () => {
        expect(isFileInChunkingFolder('notes/projets/test.md', 'notes/projets/')).toBe(true);
    });
    it('match with leading slash in filePath', () => {
        expect(isFileInChunkingFolder('/notes/projets/test.md', 'notes/projets')).toBe(true);
    });
    it('does not match if folder is empty', () => {
        expect(isFileInChunkingFolder('notes/projets/test.md', '')).toBe(false);
    });
    it('does not match if filePath is shorter', () => {
        expect(isFileInChunkingFolder('notes.md', 'notes/projets')).toBe(false);
    });
});
