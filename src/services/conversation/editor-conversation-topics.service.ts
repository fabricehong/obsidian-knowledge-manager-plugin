import { App, MarkdownView, Notice } from "obsidian";
import { DocumentStructureService } from "../document/document-structure.service";
import { ConversationTopicsService } from "./conversation-topics.service";
import { HeaderNode, RootNode } from "../../models/interfaces";
import { LoadingModal } from "../../ui/loading.modal";

export class EditorConversationTopicsService {
    constructor(
        private app: App,
        private documentStructureService: DocumentStructureService,
        private conversationTopicsService: ConversationTopicsService
    ) {}

    async listTopics(
        markdownView: MarkdownView,
        headerContainingTranscript: string
    ): Promise<void> {
        if (!markdownView.file) {
            new Notice('No active file');
            return;
        }

        try {
            const doc = await this.documentStructureService.buildHeaderTree(this.app, markdownView.file);

            // Get transcript content
            const transcriptContent = this.getTranscriptContent(doc.root, headerContainingTranscript);
            if (!transcriptContent) {
                return;
            }

            // Show loading modal
            let isCancelled = false;
            const loadingModal = new LoadingModal(this.app, () => {
                isCancelled = true;
            });
            loadingModal.open();

            try {
                // Generate topics list
                const userPrompt = this.getTemporaryUserPrompt();
                const topics = await this.conversationTopicsService.listTopics(transcriptContent, userPrompt);

                if (isCancelled) {
                    new Notice('Operation cancelled');
                    return;
                }

                // Add topics as a new section
                const header = {
                    level: 1,
                    heading: "Sujets",
                    content: topics,
                    children: []
                };
                doc.root.children.unshift(header);

                // Save changes
                const newContent = this.documentStructureService.renderToMarkdown(doc.root);
                await this.app.vault.modify(markdownView.file, newContent);

                new Notice('Topics list has been created successfully!');
            } catch (error) {
                console.error('Error listing topics:', error);
                new Notice('Error listing topics. Check the console for details.');
            } finally {
                loadingModal.forceClose();
            }
        } catch (error) {
            console.error('Error in listConversationTopics:', error);
            new Notice('Error in listConversationTopics. Check the console for details.');
        }
    }

    private getTranscriptContent(doc: RootNode, headerContainingTranscript: string): string | null {
        const transcriptNode = this.documentStructureService.findFirstNodeMatchingHeading(doc, headerContainingTranscript);
        if (!transcriptNode) {
            new Notice('No transcript section found');
            return null;
        }
        return transcriptNode.content;
    }

    private getTemporaryUserPrompt(): string {
        return `Liste tous les sujets de conversations abordés dans la conversation qui suit, et formatte les dans un mindmap tab indented (indentation par tabs et non par espaces, pas de tirets, pas de retours à la ligne inutiles). Le mindmap être très structuré (par opposition à une liste à plat). La structure du mindmap doit représenter la structure de la conversation en respectant sa chronologie au fil du temps. Si il y a plusieurs dois les mêmes sujets abordés dans la conversation, les branches seront répétées. Réponds dans un bloc de code.
Exemple:
\`\`\`
Réunion sur les systèmes de gestion des données et des ventes
	Impact des changements de systèmes
		Exemples de sacrifices adoptés par TPG
		Complexité de la gestion des données
		Optimisation et suppression de couches intermédiaires
	Problèmes techniques et formation
		Complexité technique des systèmes actuels
		Formation des employés
		Service après-vente et support client
\`\`\``;
    }
}
