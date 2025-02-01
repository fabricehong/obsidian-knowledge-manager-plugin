import { App, Notice, TFile } from 'obsidian';
import { PluginSettings } from '../../settings/settings';
import { TranscriptionService } from './transcription.service';
import KnowledgeManagerPlugin from '../../main';
import { promises as fsPromises } from 'fs';

export class EditorTranscriptionService {
    private transcriptHeader: string;

    constructor(
        private plugin: KnowledgeManagerPlugin,
        private transcriptionService: TranscriptionService
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
        
        // Mise à jour du statut
        this.plugin?.setStatusBarText('Transcription en cours...');
        
        try {
            // Créer un fichier temporaire pour le service de transcription
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            const adapter = this.plugin.app.vault.adapter;
            const tempPath = `${(adapter as any).basePath}/.temp_${file.name}`;
            await fsPromises.writeFile(tempPath, Buffer.from(arrayBuffer));

            // Utiliser le service de transcription
            const content = await this.transcriptionService.transcribeFile(tempPath, this.transcriptHeader);

            // Nettoyer le fichier temporaire
            await fsPromises.unlink(tempPath);

            // Créer le fichier dans Obsidian
            const fileName = this.generateFileName();
            const newFile = await this.plugin?.app.vault.create(
                fileName,
                content
            );

            console.log('EditorTranscriptionService: Fichier créé:', fileName);
            new Notice('Transcription terminée !');
            return newFile?.path;
        } catch (error) {
            console.error('EditorTranscriptionService: Erreur lors de la transcription:', error);
            new Notice('Erreur de transcription : ' + error.message);
            throw error;
        } finally {
            this.plugin?.setStatusBarText('');
        }
    }
}
