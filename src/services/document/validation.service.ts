import { HeaderNode, RootNode } from "../../models/interfaces";
import { REFERENCE_LINE_REGEX } from "../../constants/regex";

export class ValidationService {
    static validateNodeReferences(node: RootNode | HeaderNode, breadcrumbs: string[] = []): void {
        // Check if current node has a reference
        let hasReference = false;
        if (node.content) {
            const lines = node.content.split('\n');
            for (const line of lines) {
                if (line.match(REFERENCE_LINE_REGEX)) {
                    hasReference = true;
                    break;
                }
            }
        }

        // If this node has a reference, check that none of its children have references
        if (hasReference && 'children' in node && node.children.length > 0) {
            const childrenWithRefs = ValidationService.findChildrenWithReferences(node);
            if (childrenWithRefs.length > 0) {
                throw new Error(
                    `Invalid document structure: Found references in children of a node that already has references. ` +
                    `Parent node: ${breadcrumbs.join(' > ')}. ` +
                    `Children with refs: ${childrenWithRefs.join(', ')}`
                );
            }
        }

        // Recursively validate children
        if ('children' in node) {
            for (const child of node.children) {
                ValidationService.validateNodeReferences(child, [...breadcrumbs, child.heading]);
            }
        }
    }

    private static findChildrenWithReferences(node: RootNode | HeaderNode): string[] {
        const result: string[] = [];
        if ('children' in node) {
            for (const child of node.children) {
                if (child.content) {
                    const lines = child.content.split('\n');
                    for (const line of lines) {
                        if (line.match(REFERENCE_LINE_REGEX)) {
                            result.push(child.heading);
                            break;
                        }
                    }
                }
                // Also check child's children
                result.push(...ValidationService.findChildrenWithReferences(child));
            }
        }
        return result;
    }
}
