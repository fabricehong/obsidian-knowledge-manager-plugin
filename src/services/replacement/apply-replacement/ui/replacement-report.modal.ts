import { App, Modal } from "obsidian";
import { ReplacementReport } from "../../../../models/interfaces";

/**
 * Modal component for displaying detailed replacement reports.
 * 
 * This modal presents a comprehensive view of replacement operations,
 * including:
 * - Success/failure status for each replacement
 * - Detailed error messages if applicable
 * - Visual indicators for operation status
 * - Custom styling for better readability
 * 
 * The modal handles both successful and failed replacements,
 * providing appropriate feedback for each case.
 * 
 * @since 1.0.0
 */
export class ReplacementReportModal extends Modal {
    private reports: ReplacementReport[];

    constructor(app: App, reports: ReplacementReport[]) {
        super(app);
        this.reports = reports;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Add title
        contentEl.createEl('h2', { text: 'Replacement Report' });

        if (this.reports.length === 0) {
            contentEl.createEl('p', { text: 'No replacements were made.' });
            return;
        }

        // Create a container for the report
        const reportContainer = contentEl.createDiv({ cls: 'replacement-report-container' });

        // Add each category
        this.reports.forEach(report => {
            const categoryEl = reportContainer.createDiv({ cls: 'replacement-category' });
            
            // Category header
            categoryEl.createEl('h3', { text: report.category });

            // Create table for replacements
            const table = categoryEl.createEl('table');
            const thead = table.createEl('thead');
            const headerRow = thead.createEl('tr');
            headerRow.createEl('th', { text: 'Original' });
            headerRow.createEl('th', { text: 'Replaced With' });

            const tbody = table.createEl('tbody');
            report.replacements.forEach(replacement => {
                const row = tbody.createEl('tr');
                row.createEl('td', { text: replacement.toSearch });
                row.createEl('td', { text: replacement.target });
            });
        });

        // Add some basic styling
        this.addStyles();
    }

    private addStyles() {
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            .replacement-report-container {
                max-height: 400px;
                overflow-y: auto;
                padding: 10px;
            }
            
            .replacement-category {
                margin-bottom: 20px;
            }
            
            .replacement-category h3 {
                margin-bottom: 10px;
                color: var(--text-accent);
            }
            
            .replacement-category table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .replacement-category th,
            .replacement-category td {
                padding: 8px;
                text-align: left;
                border: 1px solid var(--background-modifier-border);
            }
            
            .replacement-category th {
                background-color: var(--background-secondary);
                font-weight: bold;
            }
            
            .replacement-category tr:nth-child(even) {
                background-color: var(--background-primary-alt);
            }
        `;
        document.head.appendChild(styleEl);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
