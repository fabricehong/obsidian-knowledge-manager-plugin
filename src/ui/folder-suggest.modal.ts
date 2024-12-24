import { App, SuggestModal, TFolder } from "obsidian";

export class FolderSuggestModal extends SuggestModal<TFolder> {
    constructor(
        app: App,
        private onSelect: (folder: TFolder) => void
    ) {
        super(app);
    }

    getSuggestions(query: string): TFolder[] {
        const folders = this.app.vault.getAllLoadedFiles()
            .filter((file): file is TFolder => file instanceof TFolder);
        
        return folders.filter(folder => 
            folder.path.toLowerCase().includes(query.toLowerCase())
        );
    }

    renderSuggestion(folder: TFolder, el: HTMLElement) {
        el.createEl("div", { text: folder.path });
    }

    onChooseSuggestion(folder: TFolder, evt: MouseEvent | KeyboardEvent) {
        this.onSelect(folder);
    }
}
