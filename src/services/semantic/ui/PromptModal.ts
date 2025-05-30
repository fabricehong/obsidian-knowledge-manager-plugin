import { App, Modal, Setting, Notice } from 'obsidian';

export class PromptModal extends Modal {
    private onSubmit: (query: string, topK: number) => void;
    private query: string = '';
    private topK: number = 5;

    constructor(app: App, onSubmit: (query: string, topK: number) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Recherche sémantique' });

        new Setting(contentEl)
            .setName('Votre requête')
            .addText(text =>
                text
                    .setPlaceholder('Entrez votre question...')
                    .onChange(value => {
                        this.query = value;
                    })
            );

        new Setting(contentEl)
            .setName('Nombre de résultats')
            .addText(text =>
                text
                    .setPlaceholder('5')
                    .setValue(this.topK.toString())
                    .onChange(value => {
                        const parsed = parseInt(value, 10);
                        if (!isNaN(parsed) && parsed > 0) {
                            this.topK = parsed;
                        }
                    })
            );

        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        const submitBtn = buttonContainer.createEl('button', { text: 'Rechercher', cls: 'mod-cta' });
        submitBtn.onclick = () => {
            if (!this.query.trim()) {
                new Notice('Veuillez entrer une requête.');
                return;
            }
            this.close();
            this.onSubmit(this.query, this.topK);
        };
    }

    onClose() {
        this.contentEl.empty();
    }
}
