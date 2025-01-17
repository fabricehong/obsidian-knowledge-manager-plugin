import { CachedMetadata, HeadingCache, SectionCache } from 'obsidian';
import { HeaderNode, RootNode } from '../models/interfaces';

export class DocumentStructureService {
    /**
     * Builds a tree structure from a markdown document using Obsidian's cache and file content.
     * 
     * This method uses both Obsidian's cached metadata and the raw file content for optimal performance
     * and accuracy:
     * - CachedMetadata: Provides pre-parsed structural information (headings, their levels and positions)
     *   avoiding the need to parse markdown syntax manually
     * - fileContent: Used to extract the actual text content between headings, which isn't stored in the cache
     * 
     * The resulting tree structure has:
     * - A root node containing content before the first heading
     * - Nested header nodes matching the document's heading hierarchy
     * - Each header node containing its heading text and the content until the next heading
     * 
     * @param cache Obsidian's cached metadata for the file, containing pre-parsed heading information
     * @param fileContent Raw file content, used to extract text between headings
     * @returns A RootNode containing the complete document structure
     */
    buildHeaderTree(cache: CachedMetadata, fileContent: string): RootNode {
        const sections = cache.sections ?? [];
        const headings = cache.headings ?? [];
        
        // Initialize root node
        const root: RootNode = {
            children: [],
            content: ''
        };

        if (headings.length === 0) {
            root.content = fileContent.trim();
            return root;
        }

        // Get content before first heading
        const firstValidHeading = headings.find(h => this.isValidHeading(h));
        if (firstValidHeading) {
            root.content = fileContent
                .split('\n')
                .slice(0, firstValidHeading.position.start.line)
                .join('\n')
                .trim();
        } else {
            root.content = fileContent.trim();
            return root;
        }

        // Process each heading
        const stack: HeaderNode[] = [];
        headings.forEach((heading, index) => {
            if (!this.isValidHeading(heading)) return;

            const nextHeading = headings
                .slice(index + 1)
                .find(h => this.isValidHeading(h));

            const node = this.createHeaderNode(heading, nextHeading, fileContent);

            // Find the correct parent for this heading
            while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
                stack.pop();
            }

            // Add to parent or root
            if (stack.length === 0) {
                root.children.push(node);
            } else {
                stack[stack.length - 1].children.push(node);
            }

            stack.push(node);
        });

        return root;
    }

    /**
     * Creates a HeaderNode from a heading
     */
    private createHeaderNode(heading: HeadingCache, nextHeading: HeadingCache | undefined, fileContent: string): HeaderNode {
        return {
            level: heading.level,
            heading: heading.heading,
            children: [],
            content: this.extractContent(heading, nextHeading, fileContent)
        };
    }

    /**
     * Checks if a heading has valid position information
     */
    private isValidHeading(heading: HeadingCache): boolean {
        return heading.position !== undefined 
            && heading.position.start !== undefined 
            && heading.position.end !== undefined
            && typeof heading.position.start.line === 'number'
            && typeof heading.position.end.line === 'number';
    }

    /**
     * Extracts content between current heading and next heading
     */
    private extractContent(currentHeading: HeadingCache, nextHeading: HeadingCache | undefined, fileContent: string): string {
        const lines = fileContent.split('\n');
        const startLine = currentHeading.position.start.line + 1;
        const endLine = nextHeading ? nextHeading.position.start.line : lines.length;
        
        return lines.slice(startLine, endLine).join('\n').trim();
    }

    /**
     * Converts a tree structure back to markdown format
     */
    renderToMarkdown(rootNode: RootNode): string {
        let markdown = rootNode.content;
        if (markdown && !markdown.endsWith('\n\n')) {
            markdown += '\n\n';
        }

        const renderNode = (node: HeaderNode): string => {
            let nodeMarkdown = '#'.repeat(node.level) + ' ' + node.heading + '\n';
            if (node.content) {
                nodeMarkdown += node.content;
                if (node.children.length > 0 && !node.content.endsWith('\n\n')) {
                    nodeMarkdown += '\n\n';
                }
            }
            
            for (const child of node.children) {
                nodeMarkdown += renderNode(child);
            }
            
            if (node.children.length === 0 && node.content && !nodeMarkdown.endsWith('\n\n')) {
                nodeMarkdown += '\n\n';
            }
            
            return nodeMarkdown;
        };

        for (const child of rootNode.children) {
            markdown += renderNode(child);
        }

        return markdown.trim();
    }

    findFirstNodeMatchingHeading(rootNode: RootNode, heading: string): HeaderNode | null {
        for (const child of rootNode.children) {
            if (child.heading === heading) {
                return child;
            }
            
            // Recursively search in children
            const found = this.findFirstNodeMatchingHeadingInNode(child, heading);
            if (found) {
                return found;
            }
        }
        return null;
    }

    private findFirstNodeMatchingHeadingInNode(node: HeaderNode, heading: string): HeaderNode | null {
        for (const child of node.children) {
            if (child.heading === heading) {
                return child;
            }
            
            const found = this.findFirstNodeMatchingHeadingInNode(child, heading);
            if (found) {
                return found;
            }
        }
        return null;
    }
}
