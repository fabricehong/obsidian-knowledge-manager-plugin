import { DiffusionRepresentation, HeaderNode, IntegrationPart, RootNode } from "../models/interfaces";
import { Notice, TFile, Vault } from "obsidian";
import { ContentFusionService } from "./content-fusion.service";
import { FilePathService } from "./file-path.service";

export class KnowledgeDiffusionService {
    constructor(
        private readonly contentFusionService: ContentFusionService,
        private readonly filePathService: FilePathService
    ) {}

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

        // If we found a ref, include both the direct content and children content
        if (currentDestination) {
            let fullContent = contentAfterRef;
            
            // If there are children, add their content as markdown
            if (node.children.length > 0) {
                if (fullContent) fullContent += '\n\n';
                for (const child of node.children) {
                    fullContent += this.headerNodeToMarkdown(child);
                }
            }

            if (fullContent.trim()) {
                const parts = diffusionMap.get(currentDestination) || [];
                parts.push({
                    breadcrumbs: nodeBreadcrumbs,
                    content: fullContent.trim()
                });
                diffusionMap.set(currentDestination, parts);
            }
        }

        // Process children recursively only if no ref was found in this node
        if (!currentDestination) {
            for (const child of node.children) {
                this.processNodeForDiffusion(child, diffusionMap, nodeBreadcrumbs);
            }
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

        // Process all header nodes
        for (const node of root.children) {
            this.processNodeForDiffusion(node, diffusionMap);
        }

        // Convert map to array of DiffusionRepresentation
        return Array.from(diffusionMap.entries()).map(([destination, parts]) => ({
            destination,
            toIntegrate: parts
        }));
    }

    async diffuseKnowledge(
        diffusionPlans: DiffusionRepresentation[],
        vault: Vault
    ): Promise<void> {
        for (const plan of diffusionPlans) {
            try {
                // Find the file in the vault using Obsidian's metadata cache
                const files = vault.getAllLoadedFiles();
                const destinationFile = files.find(file => 
                    file instanceof TFile && 
                    file.basename === plan.destination
                );

                if (!destinationFile || !(destinationFile instanceof TFile)) {
                    console.error(`Could not resolve link to file: ${plan.destination}`);
                    continue;
                }

                // Read the existing content
                const existingContent = await vault.read(destinationFile);

                // Fuse the content using ContentFusionService
                const fusedContent = await this.contentFusionService.fuseContent(
                    existingContent,
                    plan.toIntegrate
                );

                // Generate a new path for the diffused content
                const diffusedPath = this.filePathService.generateDiffusedFilePath(destinationFile, vault);
                
                console.log(`Creating diffused version at ${diffusedPath}`);
                
                // Create the new file with the fused content
                await vault.create(diffusedPath, fusedContent);
                new Notice(`Created diffused version at ${diffusedPath}`);

            } catch (error) {
                console.error(`Error processing diffusion for ${plan.destination}:`, error);
            }
        }
    }
}
