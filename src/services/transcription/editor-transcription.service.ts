import { App, Notice, TFile } from 'obsidian';
import { PluginSettings } from '../../settings/settings';
import { TranscriptionService } from './transcription.service';
import KnowledgeManagerPlugin from '../../main';
import { promises as fsPromises } from 'fs';
import { TranscriptionSuccessModal } from './transcription-success-modal';

export class EditorTranscriptionService {
    private transcriptHeader: string;

    constructor(
        private plugin: KnowledgeManagerPlugin,
        private transcriptionService: TranscriptionService,
        private transcriptionFolder: string
    ) {
        this.transcriptHeader = plugin.settings.headerContainingTranscript;
        this.updateApiKey();
    }

    updateApiKey() {
        const apiKey = this.plugin.settings.assemblyAiApiKey;
        if (apiKey) {
            this.transcriptionService.setApiKey(apiKey);
        }
    }

    private async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
        return await file.arrayBuffer();
    }

    private generateFileName(): string {
        const date = new Date();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} - ${date.getHours()}h${String(date.getMinutes()).padStart(2, '0')}.md`;
    }

    async transcribeFile(file: File): Promise<string> {
        console.log('EditorTranscriptionService: Début de la transcription pour:', file.name);
        
        try {
            // Créer un fichier temporaire pour le service de transcription
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const adapter = this.plugin.app.vault.adapter;
            const tempPath = `${(adapter as any).basePath}/.temp_${file.name}`;
            await fsPromises.writeFile(tempPath, Buffer.from(arrayBuffer));

            // Upload du fichier
            this.plugin?.setStatusBarText('Audio transcription: uploading file...');
            const uploadUrl = await this.transcriptionService.uploadFile(tempPath);

            // Transcription
            this.plugin?.setStatusBarText('Audio transcription: transcribing...');
            const content = await this.transcriptionService.transcribeFromUrl(uploadUrl, this.transcriptHeader);

            // Nettoyer le fichier temporaire
            await fsPromises.unlink(tempPath);

            // Créer le fichier dans Obsidian
            const fileName = this.generateFileName();
            const filePath = this.transcriptionFolder 
                ? `${this.transcriptionFolder}/${fileName}`
                : fileName;

            const newFile = await this.plugin?.app.vault.create(
                filePath,
                content
            );

            console.log('EditorTranscriptionService: Fichier créé:', filePath);
            
            // Afficher le modal de succès avec le lien vers le fichier
            if (newFile) {
                new TranscriptionSuccessModal(this.plugin.app, newFile.path).open();
            }
            
            this.plugin?.setStatusBarText('');
            return newFile?.path;
        } catch (error) {
            console.error('EditorTranscriptionService: Erreur lors de la transcription:', error);
            new Notice('Erreur de transcription : ' + error.message);
            this.plugin?.setStatusBarText('');
            throw error;
        }
    }
}
