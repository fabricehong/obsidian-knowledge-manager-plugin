import { CachedMetadata, HeadingCache, TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import { DirectoryNode, FileNode, HeaderNode, RootNode, DiffusionRepresentation, IntegrationPart } from "../models/interfaces";

export class VaultService {
    constructor(private vault: Vault) {}

    mapVault(): DirectoryNode {
        const rootFolder = this.vault.getRoot();
        return this.mapDirectory(rootFolder);
    }

    mapDirectory(folder: TFolder): DirectoryNode {
        const directoryNode: DirectoryNode = {
            name: folder.name,
            subdirectories: [],
            files: []
        };

        // Map all children
        for (const child of folder.children) {
            if (child instanceof TFile) {
                directoryNode.files.push(this.mapFile(child));
            } else if (child instanceof TFolder) {
                directoryNode.subdirectories.push(this.mapDirectory(child));
            }
        }

        // Sort subdirectories and files by name for consistent output
        directoryNode.subdirectories.sort((a, b) => a.name.localeCompare(b.name));
        directoryNode.files.sort((a, b) => a.name.localeCompare(b.name));

        return directoryNode;
    }

    getFolder(path: string): TFolder | null {
        const abstractFile = this.vault.getAbstractFileByPath(path);
        if (abstractFile instanceof TFolder) {
            return abstractFile;
        }
        return null;
    }

    private mapFile(file: TFile): FileNode {
        return {
            name: file.name
        };
    }

    getStringRepresentation(node: DirectoryNode, level: number = 0): string {
        const indent = '\t'.repeat(level);
        let result = `${indent}${node.name}/\n`;

        // Add subdirectories
        for (const subdir of node.subdirectories) {
            result += this.getStringRepresentation(subdir, level + 1);
        }

        // Add files
        for (const file of node.files) {
            result += `${indent}\t${file.name}\n`;
        }

        return result;
    }

    private isValidHeading(heading: HeadingCache): heading is HeadingCache & { 
        position: { start: { line: number; col: number; offset: number; }, end: { line: number; col: number; offset: number; } } 
    } {
        return heading.position !== undefined 
            && heading.position.start !== undefined 
            && heading.position.end !== undefined
            && typeof heading.position.start.line === 'number'
            && typeof heading.position.end.line === 'number';
    }

    buildHeaderTree(cache: CachedMetadata, fileContent: string): RootNode {
        const headings = cache.headings ?? [];
        let stack: HeaderNode[] = [];
        const root: RootNode = {
            children: [],
            content: ''
        };
        
        // Extract content before first heading
        if (headings.length > 0 && this.isValidHeading(headings[0])) {
            root.content = fileContent
                .split('\n')
                .slice(0, headings[0].position.start.line)
                .join('\n')
                .trim();
        } else {
            root.content = fileContent.trim();
        }
        
        headings.forEach((heading, index) => {
            if (!this.isValidHeading(heading)) return;

            const nextHeading = index < headings.length - 1 ? headings[index + 1] : null;

            const node: HeaderNode = {
                level: heading.level,
                heading: heading.heading,
                position: {
                    start: { ...heading.position.start },
                    end: { ...heading.position.end }
                },
                children: [],
                content: this.extractContent(fileContent, heading, nextHeading)
            };

            // Find the correct parent for this heading
            while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
                stack.pop();
            }

            if (stack.length === 0) {
                root.children.push(node);
            } else {
                stack[stack.length - 1].children.push(node);
            }
            
            stack.push(node);
        });

        return root;
    }

    private extractContent(fileContent: string, currentHeading: HeadingCache, nextHeading: HeadingCache | null): string {
        if (!this.isValidHeading(currentHeading)) return '';
        
        const lines = fileContent.split('\n');
        const startLine = currentHeading.position.start.line + 1;
        const endLine = nextHeading && this.isValidHeading(nextHeading) 
            ? nextHeading.position.start.line 
            : lines.length;
        
        return lines.slice(startLine, endLine).join('\n').trim();
    }

    private headerNodeToMarkdown(node: HeaderNode): string {
        let result = '#'.repeat(node.level) + ' ' + node.heading + '\n\n';
        if (node.content) {
            result += node.content + '\n\n';
        }
        
        for (const child of node.children) {
            result += this.headerNodeToMarkdown(child);
        }
        
        return result;
    }

    private extractRefDestination(content: string): string | null {
        const match = content.match(/\|\s*ref:\s*\[\[(.*?)\]\]/);
        return match ? match[1].trim() : null;
    }

    private getBreadcrumbs(node: HeaderNode, breadcrumbs: string[] = []): string[] {
        return [...breadcrumbs, node.heading];
    }

    private processNodeForDiffusion(
        node: HeaderNode, 
        diffusionMap: Map<string, IntegrationPart[]>,
        currentBreadcrumbs: string[] = []
    ): void {
        const nodeBreadcrumbs = this.getBreadcrumbs(node, currentBreadcrumbs);
        
        // Check if this node's content contains a ref
        const lines = node.content.split('\n');
        let contentAfterRef = '';
        let currentDestination: string | null = null;
        
        for (let i = 0; i < lines.length; i++) {
            const destination = this.extractRefDestination(lines[i]);
            if (destination) {
                currentDestination = destination;
                // Take all content after this line
                contentAfterRef = lines.slice(i + 1).join('\n').trim();
                break;
            }
        }

        // If we found a ref and have content after it
        if (currentDestination && contentAfterRef) {
            const parts = diffusionMap.get(currentDestination) || [];
            parts.push({
                breadcrumbs: nodeBreadcrumbs,
                content: contentAfterRef
            });
            diffusionMap.set(currentDestination, parts);
        }

        // If this node has children and no ref was found in its content,
        // check if any children should be included in the content
        if (node.children.length > 0 && !currentDestination) {
            let childrenContent = '';
            for (const child of node.children) {
                childrenContent += this.headerNodeToMarkdown(child);
            }
            
            // Check if parent has a ref, and if so, include children's content
            const parentRef = this.extractRefDestination(node.content);
            if (parentRef && childrenContent) {
                const parts = diffusionMap.get(parentRef) || [];
                parts.push({
                    breadcrumbs: nodeBreadcrumbs,
                    content: childrenContent.trim()
                });
                diffusionMap.set(parentRef, parts);
            }
        }

        // Process children recursively
        for (const child of node.children) {
            this.processNodeForDiffusion(child, diffusionMap, nodeBreadcrumbs);
        }
    }

    buildDiffusionRepresentation(root: RootNode): DiffusionRepresentation[] {
        const diffusionMap = new Map<string, IntegrationPart[]>();
        
        // Process root content for refs
        const rootLines = root.content.split('\n');
        let currentDestination: string | null = null;
        let contentAfterRef = '';
        
        for (let i = 0; i < rootLines.length; i++) {
            const destination = this.extractRefDestination(rootLines[i]);
            if (destination) {
                currentDestination = destination;
                contentAfterRef = rootLines.slice(i + 1).join('\n').trim();
                break;
            }
        }

        if (currentDestination && contentAfterRef) {
            const parts = diffusionMap.get(currentDestination) || [];
            parts.push({
                breadcrumbs: [],
                content: contentAfterRef
            });
            diffusionMap.set(currentDestination, parts);
        }

        // Process all headers
        for (const node of root.children) {
            this.processNodeForDiffusion(node, diffusionMap);
        }

        // Convert map to array format
        return Array.from(diffusionMap.entries()).map(([destination, parts]) => ({
            destination,
            toIntegrate: parts
        }));
    }
}
