import { AssemblyAI } from 'assemblyai';
import { promises as fs } from 'fs';

export class TranscriptionService {
    private client: AssemblyAI;

    constructor(apiKey?: string) {
        if (apiKey) {
            this.setApiKey(apiKey);
        }
    }

    setApiKey(apiKey: string) {
        this.client = new AssemblyAI({
            apiKey: apiKey
        });
    }

    private async readFileAsArrayBuffer(filePath: string): Promise<ArrayBuffer> {
        const fileBuffer = await fs.readFile(filePath);
        return fileBuffer.buffer;
    }

    private formatTranscriptContent(transcript: any, transcriptHeader: string): string {
        let content = `# ${transcriptHeader}\n`;
        
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

    async transcribeFile(filePath: string, transcriptHeader: string): Promise<string> {
        if (!this.client) {
            console.error('TranscriptionService: Clé API non configurée');
            throw new Error('La clé API AssemblyAI n\'est pas configurée.');
        }
        
        try {
            // Lire le fichier
            const audioData = await this.readFileAsArrayBuffer(filePath);
            console.log('TranscriptionService: Fichier lu avec succès');

            // Upload du fichier
            console.log('TranscriptionService: Upload du fichier vers AssemblyAI');
            const uploadUrl = await this.client.files.upload(new Uint8Array(audioData));

            if (!uploadUrl) {
                throw new Error('Erreur lors de l\'upload du fichier');
            }

            // Transcription
            console.log('TranscriptionService: Début de la transcription');
            const transcript = await this.client.transcripts.transcribe({
                audio_url: uploadUrl,
                speaker_labels: true,
                language_detection: true
            });

            if (!transcript.text) {
                console.error('TranscriptionService: Transcription vide');
                throw new Error('La transcription est vide');
            }

            console.log('TranscriptionService: Transcription reçue');
            return this.formatTranscriptContent(transcript, transcriptHeader);
        } catch (error) {
            console.error('TranscriptionService: Erreur lors de la transcription:', error);
            throw error;
        }
    }
}
