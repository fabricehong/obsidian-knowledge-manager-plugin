import { App, Modal, ButtonComponent } from 'obsidian';

export class LoadingModal extends Modal {
    private progressTextEl: HTMLElement;
    
    constructor(app: App, private onCancel: () => void, initialMessage?: string) {
        super(app);
        this.titleEl.setText('Working...');
        
        // Enlever le bouton de fermeture
        const closeButton = this.modalEl.querySelector('.modal-close-button');
        if (closeButton) {
            closeButton.remove();
        }
        
        // Ajouter le spinner et le texte
        const contentEl = this.contentEl.createEl('div', { cls: 'loading-container' });
        contentEl.createEl('div', { cls: 'loading-spinner' });
        this.progressTextEl = contentEl.createEl('div', { 
            text: initialMessage || 'This may take a minute...',
            cls: 'loading-text'
        });

        // Ajouter le bouton d'annulation
        const buttonContainer = contentEl.createEl('div', { cls: 'modal-button-container' });
        new ButtonComponent(buttonContainer)
            .setButtonText('Cancel')
            .onClick(() => {
                this.onCancel();
                this.forceClose();
            });

        // Empêcher la fermeture de la modale par clic
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

    // Méthodes pour mettre à jour la progression
    updateProgress(message: string): void {
        if (this.progressTextEl) {
            this.progressTextEl.textContent = message;
        }
    }
    
    updateTitle(title: string): void {
        this.titleEl.textContent = title;
    }

    private _shouldAllowClose: boolean;
}
