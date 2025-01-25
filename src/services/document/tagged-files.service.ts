import { App, TFile } from 'obsidian';

export class TaggedFilesService {
    constructor(private app: App) {}

    /**
     * Find all files tagged with the specified tag
     */
    public findTaggedFiles(tag: string): TFile[] {
        const targetTag = `#${tag}`.replace(/^##/, '#'); // Évite les doubles #
        
        return this.app.vault.getMarkdownFiles().filter(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache) return false;

            // Check frontmatter tags
            let hasFrontmatterTag = false;
            if (cache.frontmatter?.tags) {
                const frontmatterTags = cache.frontmatter.tags;
                if (Array.isArray(frontmatterTags)) {
                    // Si c'est un tableau, on utilise some
                    hasFrontmatterTag = frontmatterTags.some(t => 
                        (t === tag || t === targetTag)
                    );
                } else if (typeof frontmatterTags === 'string') {
                    // Si c'est une chaîne, on split sur la virgule et on trim
                    const tagArray = frontmatterTags.split(',').map(t => t.trim());
                    hasFrontmatterTag = tagArray.some(t => 
                        (t === tag || t === targetTag)
                    );
                }
            }
            
            // Check inline tags
            const hasInlineTag = cache.tags?.some(tag => tag.tag === targetTag);

            if (hasFrontmatterTag || hasInlineTag) {
                console.log('Found tag in file:', file.path);
            }

            return hasFrontmatterTag || hasInlineTag;
        });
    }
}
