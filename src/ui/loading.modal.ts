import { App, Modal } from 'obsidian';

export class LoadingModal extends Modal {
    constructor(app: App) {
        super(app);
        this.titleEl.setText('Processing Glossary Terms');
        
        // Enlever le bouton de fermeture
        const closeButton = this.modalEl.querySelector('.modal-close-button');
        if (closeButton) {
            closeButton.remove();
        }
        
        // Ajouter le spinner
        const contentEl = this.contentEl.createEl('div', { cls: 'loading-container' });
        contentEl.createEl('div', { cls: 'loading-spinner' });
        contentEl.createEl('div', { 
            text: 'This may take a minute...',
            cls: 'loading-text'
        });

        // Empêcher complètement la fermeture de la modale
        this.modalEl.onclick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };

        // Surcharger la méthode close pour qu'elle ne fasse rien
        const originalClose = this.close.bind(this);
        this.close = () => {
            if (this._shouldAllowClose) {
                originalClose();
            }
        };
        this._shouldAllowClose = false;
    }

    // Méthode pour permettre la fermeture programmée
    forceClose() {
        this._shouldAllowClose = true;
        this.close();
    }

    private _shouldAllowClose: boolean;
}
