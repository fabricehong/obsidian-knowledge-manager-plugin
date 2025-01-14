import { App, SuggestModal, TFile } from 'obsidian';

export class FileSuggestModal extends SuggestModal<TFile> {
    constructor(
        app: App,
        private templateDir: string,
        private onChoose: (filePath: string) => void
    ) {
        super(app);
    }

    getSuggestions(query: string): TFile[] {
        const files = this.app.vault.getFiles();
        const suggestions = files.filter(file => {
            const isInTemplateDir = file.path.startsWith(this.templateDir);
            const isMarkdown = file.extension === 'md';
            const matchesQuery = !query || file.path.toLowerCase().includes(query.toLowerCase());
            
            // Debug log
            console.debug(`File ${file.path}: inTemplateDir=${isInTemplateDir}, isMarkdown=${isMarkdown}, matchesQuery=${matchesQuery}`);
            
            return isInTemplateDir && isMarkdown && matchesQuery;
        });

        console.debug(`Found ${suggestions.length} suggestions for query "${query}" in directory "${this.templateDir}"`);
        return suggestions.slice(0, 10);
    }

    renderSuggestion(file: TFile, el: HTMLElement) {
        // Show just the filename instead of the full path
        el.createEl('div', { text: file.name });
    }

    onChooseSuggestion(file: TFile) {
        this.onChoose(file.path);
    }
}
