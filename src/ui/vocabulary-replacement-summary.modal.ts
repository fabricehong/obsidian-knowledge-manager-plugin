import { App, Modal, Setting } from "obsidian";
import { ReplacementSummary } from "../models/interfaces";

export class VocabularyReplacementSummaryModal extends Modal {
    private onAccept: () => void;
    private summary: ReplacementSummary;

    constructor(app: App, summary: ReplacementSummary, onAccept: () => void) {
        super(app);
        this.summary = summary;
        this.onAccept = onAccept;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: "Vocabulary Replacements" });

        // Show total replacements
        new Setting(contentEl)
            .setName("Total Replacements")
            .setDesc(`${this.summary.totalReplacements} replacements will be made`);

        // Create a container for the replacements list
        const replacementsContainer = contentEl.createEl("div", { cls: "replacement-list" });

        // Add each replacement
        this.summary.replacements.forEach(replacement => {
            const replacementEl = replacementsContainer.createEl("div", { cls: "replacement-item" });
            replacementEl.createEl("div", {
                text: `"${replacement.original}" → "${replacement.corrected}"`,
                cls: "replacement-text"
            });
            replacementEl.createEl("div", {
                text: `${replacement.occurrences} occurrence${replacement.occurrences > 1 ? 's' : ''}`,
                cls: "replacement-count"
            });
        });

        // Add buttons
        const buttonContainer = contentEl.createEl("div", { cls: "button-container" });

        buttonContainer.createEl("button", { text: "Cancel" })
            .addEventListener("click", () => this.close());

        buttonContainer.createEl("button", { text: "Accept All", cls: "mod-cta" })
            .addEventListener("click", () => {
                this.onAccept();
                this.close();
            });

        // Add CSS
        this.addStyle();
    }

    private addStyle() {
        const style = document.createElement('style');
        style.textContent = `
            .replacement-list {
                max-height: 300px;
                overflow-y: auto;
                margin: 1em 0;
                padding: 0.5em;
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
            }
            .replacement-item {
                padding: 0.5em;
                border-bottom: 1px solid var(--background-modifier-border);
            }
            .replacement-item:last-child {
                border-bottom: none;
            }
            .replacement-text {
                font-family: var(--font-monospace);
                margin-bottom: 0.2em;
            }
            .replacement-count {
                font-size: 0.9em;
                color: var(--text-muted);
            }
            .button-container {
                display: flex;
                justify-content: flex-end;
                gap: 1em;
                margin-top: 1em;
            }
        `;
        document.head.appendChild(style);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
