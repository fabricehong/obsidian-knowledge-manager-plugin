import { App, Modal, Notice } from 'obsidian';
import { EditorTranscriptionService } from './editor-transcription.service';

export class TranscriptionModal extends Modal {
    private selectedFile: File | null = null;
    private fileInput: HTMLInputElement;

    constructor(app: App, private editorTranscriptionService: EditorTranscriptionService) {
        super(app);
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        
        contentEl.createEl('h2', { text: 'Transcription Audio' });

        const dropZone = contentEl.createDiv({ cls: 'file-drop-zone' });
        dropZone.createSpan({ text: 'Glissez un fichier MP3 ici ou cliquez pour sélectionner' });
        
        this.fileInput = dropZone.createEl('input', {
            type: 'file',
            attr: {
                accept: '.mp3',
                style: 'display: none;'
            }
        });

        // Gestion du drag & drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.addClass('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.removeClass('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.removeClass('drag-over');
            
            if (e.dataTransfer?.files.length) {
                const file = e.dataTransfer.files[0];
                console.log('TranscriptionModal: Fichier déposé:', file.name);
                if (file.name.endsWith('.mp3')) {
                    this.selectedFile = file;
                    dropZone.setText(file.name);
                } else {
                    console.warn('TranscriptionModal: Type de fichier invalide');
                    new Notice('Veuillez sélectionner un fichier MP3');
                }
            }
        });

        // Gestion du clic pour sélectionner un fichier
        dropZone.addEventListener('click', () => {
            console.log('TranscriptionModal: Ouverture du sélecteur de fichiers');
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', () => {
            const file = this.fileInput.files?.[0];
            if (file) {
                console.log('TranscriptionModal: Fichier sélectionné:', file.name);
                this.selectedFile = file;
                dropZone.setText(file.name);
            }
        });

        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        
        buttonContainer.createEl('button', { text: 'Annuler' })
            .addEventListener('click', () => this.close());
        
        const transcribeButton = buttonContainer.createEl('button', {
            text: 'Transcrire',
            cls: 'mod-cta'
        });

        transcribeButton.addEventListener('click', async () => {
            console.log('TranscriptionModal: Clic sur le bouton Transcrire');
            if (!this.selectedFile) {
                console.warn('TranscriptionModal: Aucun fichier sélectionné');
                new Notice('Veuillez sélectionner un fichier MP3');
                return;
            }

            // Fermer la modale immédiatement
            this.close();
            
            try {
                console.log('TranscriptionModal: Début de la transcription');
                await this.editorTranscriptionService.transcribeFile(this.selectedFile);
                console.log('TranscriptionModal: Transcription terminée avec succès');
            } catch (error) {
                console.error('TranscriptionModal: Erreur de transcription:', error);
            }
        });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}
