import { App, Modal, ButtonComponent } from "obsidian";
import { ReplacementStatistics } from "../../../../models/interfaces";

/**
 * Modal component for displaying replacement statistics.
 * 
 * Presents a detailed view of replacement operations performed,
 * organized by categories and showing counts for each replacement.
 * 
 * @since 1.0.0
 */
export class ReplacementStatisticsModal extends Modal {
    constructor(app: App, private statistics: ReplacementStatistics[]) {
        super(app);
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.createEl("h2", { text: "Statistiques des remplacements" });

        const markdownContainer = contentEl.createDiv("markdown-rendered");

        for (const categoryStats of this.statistics) {
            const categoryEl = markdownContainer.createDiv("replacement-category");
            categoryEl.createEl("h3", { text: categoryStats.category });

            const tableContainer = categoryEl.createDiv("table-container");
            const table = tableContainer.createEl("table");
            const headerRow = table.createEl("thead").createEl("tr");
            headerRow.createEl("th", { text: "Terme original", cls: "table-cell" });
            headerRow.createEl("th", { text: "Remplacé par", cls: "table-cell" });
            headerRow.createEl("th", { text: "Nombre", cls: "table-cell-right" });

            const tbody = table.createEl("tbody");
            for (const replacement of categoryStats.replacements) {
                const row = tbody.createEl("tr");
                row.createEl("td", { text: replacement.from, cls: "table-cell" });
                row.createEl("td", { text: replacement.to, cls: "table-cell" });
                row.createEl("td", { text: replacement.count.toString(), cls: "table-cell-right" });
            }
        }

        const buttonContainer = contentEl.createDiv("modal-button-container");
        new ButtonComponent(buttonContainer)
            .setButtonText("OK")
            .setCta()
            .onClick(() => this.close());
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

/**
 * Simple modal for displaying informational messages.
 * 
 * Presents a message to the user in a modal dialog with
 * minimal styling and a single close button.
 * 
 * @since 1.0.0
 */
export class InfoModal extends Modal {
    constructor(app: App, private message: string) {
        super(app);
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.createEl("p", { text: this.message });
        
        const buttonContainer = contentEl.createDiv("modal-button-container");
        new ButtonComponent(buttonContainer)
            .setButtonText("OK")
            .setCta()
            .onClick(() => this.close());
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

/**
 * Modal component for displaying confirmation dialogs.
 * 
 * Presents a simple confirmation dialog with a message and
 * two buttons: Continue and Cancel.
 * 
 * @since 1.0.0
 */
export class ReplacementConfirmationModal extends Modal {
    private resolvePromise: (value: boolean) => void;

    constructor(app: App, private message: string, resolve: (value: boolean) => void) {
        super(app);
        this.resolvePromise = resolve;
    }

    onOpen() {
        const {contentEl} = this;
        
        contentEl.createEl("p", { text: this.message });
        
        const buttonContainer = contentEl.createDiv("modal-button-container");
        
        new ButtonComponent(buttonContainer)
            .setButtonText("Continuer")
            .setCta()
            .onClick(() => {
                this.resolvePromise(true);
                this.close();
            });

        new ButtonComponent(buttonContainer)
            .setButtonText("Annuler")
            .onClick(() => {
                this.resolvePromise(false);
                this.close();
            });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

/**
 * Generic confirmation modal with customizable title and actions.
 * 
 * Provides a reusable confirmation dialog with:
 * - Custom title and message
 * - Confirm and cancel callbacks
 * - Standard styling consistent with Obsidian
 * 
 * @since 1.0.0
 */
export class ConfirmationModal extends Modal {
    constructor(
        app: App,
        private title: string,
        private message: string,
        private onConfirm: () => void,
        private onCancel: () => void
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: this.title });
        
        const messageEl = contentEl.createDiv({ cls: 'replacement-preview' });
        const lines = this.message.split('\n');
        
        // Format each line
        lines.forEach(line => {
            if (line.startsWith('Total')) {
                messageEl.createEl('div', { 
                    text: line,
                    cls: 'replacement-total'
                });
            } else if (line.startsWith('-')) {
                messageEl.createEl('div', { 
                    text: line,
                    cls: 'replacement-item'
                });
            } else if (line.trim()) {
                messageEl.createEl('div', { 
                    text: line,
                    cls: 'replacement-category'
                });
            }
        });

        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

        buttonContainer.createEl('button', { 
            text: 'Confirm',
            cls: 'mod-cta'
        }).addEventListener('click', () => {
            this.onConfirm();
            this.close();
        });

        buttonContainer.createEl('button', { text: 'Cancel' })
            .addEventListener('click', () => {
                this.onCancel();
                this.close();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
