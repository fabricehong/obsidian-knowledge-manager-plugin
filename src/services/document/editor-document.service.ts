import { App, MarkdownView, Notice } from "obsidian";
import { HeaderNode, RootNode } from "../../models/interfaces";
import { DocumentStructureService } from "./document-structure.service";

export class EditorDocumentService {

    constructor(
        private app: App,
        private documentStructureService: DocumentStructureService,
    ) {}

    async getDocument(markdownView: MarkdownView): Promise<RootNode> {
        return await this.documentStructureService.buildHeaderTree(this.app, markdownView.file);
    }

    async writeDocument(doc: RootNode): Promise<void> {
        const newContent = this.documentStructureService.renderToMarkdown(doc);
        await this.app.vault.modify(doc.file, newContent);
    }

    async getHeaderContent(
        doc: RootNode,
        headerContent: string
    ): Promise<string> {
        const node = this.documentStructureService.findFirstNodeMatchingHeading(doc, headerContent);
        if (!node) {
            throw new Error('No section found');
        }
        return node.content;
    }

    checkHeaderNotInDocument(doc: RootNode, headerContent: string): void {
        const node = this.documentStructureService.findFirstNodeMatchingHeading(doc, headerContent);
        if (node) {
            new Notice('Header already exists');
            throw new Error();
        }
    }

    addHeaderToDocument(doc: RootNode, header: string, content: string): void {
        const newHeader: HeaderNode = {
            level: 1,
            heading: header,
            children: [],
            content,
        };
        doc.children.unshift(newHeader);
    }
}