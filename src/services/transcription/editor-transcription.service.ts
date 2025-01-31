import { App, Notice, TFile } from 'obsidian';
import { AssemblyAI } from 'assemblyai';
import KnowledgeManagerPlugin from '../../main';
import { PluginSettings } from '../../settings/settings';

export class EditorTranscriptionService {
    private client: AssemblyAI;
    private plugin: KnowledgeManagerPlugin;
    
    constructor(private transcriptHeader: string, private assemblyAiApiKey: string) {
        console.log('EditorTranscriptionService: Initialisation du service');
        this.updateClient(assemblyAiApiKey);
    }

    private updateClient(assemblyAiApiKey: string) {
        if (assemblyAiApiKey) {
            console.log('EditorTranscriptionService: Configuration du client AssemblyAI');
            this.client = new AssemblyAI({
                apiKey: assemblyAiApiKey
            });
        }
    }

    private async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
        console.log('EditorTranscriptionService: Lecture du fichier:', file.name);
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                const arrayBuffer = reader.result as ArrayBuffer;
                resolve(arrayBuffer);
            };
            
            reader.onerror = () => {
                reject(new Error('Erreur lors de la lecture du fichier'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    private formatTranscriptContent(transcript: any): string {
        let content = `# ${this.transcriptHeader}\n`;
        
        if (!transcript.utterances || transcript.utterances.length === 0) {
            // Si pas de diarisation, retourner le texte brut
            return content + transcript.text;
        }

        // Avec diarisation, formater chaque intervention
        let currentSpeaker = '';
        for (const utterance of transcript.utterances) {
            if (utterance.speaker !== currentSpeaker) {
                currentSpeaker = utterance.speaker;
                content += `Speaker ${utterance.speaker}:\n`;
            }
            content += `${utterance.text}\n\n`;
        }

        return content;
    }

    async transcribeFile(file: File): Promise<string> {
        console.log('EditorTranscriptionService: Début de la transcription pour:', file.name);
        
        if (!this.client) {
            console.error('EditorTranscriptionService: Clé API non configurée');
            throw new Error('La clé API AssemblyAI n\'est pas configurée. Veuillez la configurer dans les paramètres du plugin.');
        }

        // Mise à jour du statut
        this.plugin?.setStatusBarText('Transcription en cours...');
        
        try {
            // Lire le fichier
            const audioData = await this.readFileAsArrayBuffer(file);
            console.log('EditorTranscriptionService: Fichier lu avec succès');

            // Upload du fichier
            console.log('EditorTranscriptionService: Upload du fichier vers AssemblyAI');
            const uploadUrl = await this.client.files.upload(new Uint8Array(audioData));

            if (!uploadUrl) {
                throw new Error('Erreur lors de l\'upload du fichier');
            }

            // Transcription
            console.log('EditorTranscriptionService: Début de la transcription');
            const transcript = await this.client.transcripts.transcribe({
                audio_url: uploadUrl,
                speaker_labels: true,
                language_detection: true
            });

            if (!transcript.text) {
                console.error('EditorTranscriptionService: Transcription vide');
                throw new Error('La transcription est vide');
            }

            console.log('EditorTranscriptionService: Transcription reçue, création du fichier');
            // Créer nouveau fichier avec date
            const fileName = this.generateFileName();
            const content = this.formatTranscriptContent(transcript);
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

    private generateFileName(): string {
        const date = new Date();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} - ${date.getHours()}h${String(date.getMinutes()).padStart(2, '0')}.md`;
    }

    setPlugin(plugin: KnowledgeManagerPlugin) {
        this.plugin = plugin;
    }
}
