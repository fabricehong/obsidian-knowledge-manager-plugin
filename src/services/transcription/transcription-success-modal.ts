import { App, Modal, TFile } from 'obsidian';

export class TranscriptionSuccessModal extends Modal {
    constructor(
        app: App,
        private filePath: string
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Titre
        contentEl.createEl('h2', { text: 'Transcription terminée !' });

        // Message avec le lien
        const messageDiv = contentEl.createDiv();
        messageDiv.createSpan({ text: 'La transcription a été sauvegardée dans : ' });
        
        // Créer un lien cliquable vers le fichier
        const link = messageDiv.createEl('a', {
            text: this.filePath,
            cls: 'mod-clickable'
        });
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Ouvrir le fichier dans un nouvel onglet
            const file = this.app.vault.getAbstractFileByPath(this.filePath);
            if (file instanceof TFile) {
                this.app.workspace.getLeaf(false).openFile(file);
                this.close();
            }
        });

        // Bouton OK
        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        const okButton = buttonContainer.createEl('button', {
            text: 'OK',
            cls: 'mod-cta'
        });
        okButton.addEventListener('click', () => this.close());
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
