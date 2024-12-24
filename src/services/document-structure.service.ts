import { CachedMetadata, HeadingCache } from "obsidian";
import { HeaderNode, RootNode } from "../models/interfaces";

export class DocumentStructureService {
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
}
