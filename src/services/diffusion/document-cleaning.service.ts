import { CachedMetadata } from "obsidian";
import { HeaderNode, RootNode } from "../../models/interfaces";
import { REFERENCE_LINE_REGEX } from '../../constants/regex';
import { ValidationService } from "../validation.service";

export class DocumentCleaningService {
    cleanNode(node: RootNode | HeaderNode): RootNode | HeaderNode {
        // Validate the document structure first
        ValidationService.validateNodeReferences(node);

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
            node.content = cleanedContent.trim();

            // If there's a reference in a non-root node, don't process its children
            if (hasReference && 'level' in node) {
                node.children = [];
                return node;
            }
        }

        // Process children if this is the root node or no reference was found
        if ('children' in node) {
            const newChildren: HeaderNode[] = [];
            for (const child of node.children) {
                const cleanedChild = this.cleanNode(child) as HeaderNode;
                newChildren.push(cleanedChild);
            }
            node.children = newChildren;
        }

        return node;
    }
}
