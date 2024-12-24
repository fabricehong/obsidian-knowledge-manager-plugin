import { CachedMetadata } from "obsidian";
import { HeaderNode, RootNode } from "../models/interfaces";
import { REFERENCE_LINE_REGEX } from '../constants/regex';
import { ValidationService } from "./validation.service";

export class DocumentCleaningService {
    cleanNode(node: RootNode | HeaderNode): string {
        // Validate the document structure first
        ValidationService.validateNodeReferences(node);

        let result = '';

        // Process current node's content
        if (node.content) {
            const lines = node.content.split('\n');
            let cleanedContent = '';
            let hasReference = false;
            
            for (const line of lines) {
                cleanedContent += line + '\n';
                if (line.match(REFERENCE_LINE_REGEX)) {
                    hasReference = true;
                    break;
                }
            }
            result += cleanedContent.trim();

            // If there's a reference in a non-root node, don't process its children
            if (hasReference && 'level' in node) {
                return result;
            }
        }

        // Process children if this is the root node or no reference was found
        if ('children' in node) {
            for (const child of node.children) {
                if (result) {
                    result += '\n\n';
                }
                result += '#'.repeat(child.level) + ' ' + child.heading + '\n';
                const childContent = this.cleanNode(child);
                if (childContent) {
                    result += childContent;
                }
            }
        }

        return result.trim();
    }
}
