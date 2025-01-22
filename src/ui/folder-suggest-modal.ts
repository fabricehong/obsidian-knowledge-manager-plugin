import { App, FuzzySuggestModal, TFolder } from 'obsidian';

export class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
    private onChoose: (folder: TFolder) => void;

    constructor(app: App, onChoose: (folder: TFolder) => void) {
        super(app);
        this.onChoose = onChoose;
    }

    getItems(): TFolder[] {
        return this.app.vault.getAllLoadedFiles()
            .filter(f => f instanceof TFolder)
            .map(f => f as TFolder);
    }

    getItemText(folder: TFolder): string {
        return folder.path;
    }

    onChooseItem(folder: TFolder): void {
        this.onChoose(folder);
    }
}
