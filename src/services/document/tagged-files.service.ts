import { App, TFile } from 'obsidian';

export class TaggedFilesService {
    constructor(private app: App) {}

    /**
     * Find all files tagged with the specified tag
     * @param tag - tag without # (e.g. "replacement-specs")
     */
    public findTaggedFiles(tag: string): TFile[] {
        const targetTag = `#${tag}`; // Le tag tel qu'il est stocké dans Obsidian
        
        // Obtient tous les fichiers markdown
        return this.app.vault.getMarkdownFiles()
            .filter(file => {
                const cache = this.app.metadataCache.getCache(file.path);
                if (!cache) return false;
                
                // Vérifie les tags inline
                if (cache.tags?.some(t => t.tag === targetTag)) {
                    return true;
                }
                
                // Vérifie les tags dans le frontmatter
                const frontmatterTags = cache.frontmatter?.tags;
                if (!frontmatterTags) return false;
                
                if (Array.isArray(frontmatterTags)) {
                    // Dans le frontmatter, les tags sont stockés avec le #
                    return frontmatterTags.includes(targetTag);
                } else if (typeof frontmatterTags === 'string') {
                    // Si c'est une chaîne, on split sur la virgule et on trim
                    return frontmatterTags.split(',')
                        .map(t => t.trim())
                        .includes(targetTag);
                }
                
                return false;
            });
    }
}
