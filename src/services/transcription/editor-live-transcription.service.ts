import { App, Editor, Notice } from 'obsidian';
import { AssemblyAI } from 'assemblyai';
import KnowledgeManagerPlugin from '../../main';

export class EditorLiveTranscriptionService {
    private client: AssemblyAI;
    private plugin: KnowledgeManagerPlugin;
    private mediaRecorder: MediaRecorder | null = null;
    private isRecording = false;
    private currentEditor: Editor | null = null;
    private audioChunks: Blob[] = [];
    private allAudioChunks: Blob[] = []; // Pour sauvegarder l'audio complet
    private uploadUrl: string | null = null;
    private transcriptId: string | null = null;
    private pollingInterval: NodeJS.Timeout | null = null;

    constructor(private assemblyAiApiKey: string) {
        console.log('EditorLiveTranscriptionService: Initialisation du service');
        this.updateClient(assemblyAiApiKey);
    }

    private updateClient(assemblyAiApiKey: string) {
        if (assemblyAiApiKey) {
            console.log('EditorLiveTranscriptionService: Configuration du client AssemblyAI');
            this.client = new AssemblyAI({
                apiKey: assemblyAiApiKey
            });
        }
    }

    setPlugin(plugin: KnowledgeManagerPlugin) {
        this.plugin = plugin;
    }

    private async setupMediaRecorder(): Promise<boolean> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            return true;
        } catch (error) {
            console.error('EditorLiveTranscriptionService: Erreur lors de l\'accès au micro:', error);
            new Notice('Erreur : impossible d\'accéder au microphone');
            return false;
        }
    }

    private async uploadAudioChunk(chunk: Blob): Promise<string | null> {
        try {
            const buffer = await chunk.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            return await this.client.files.upload(uint8Array);
        } catch (error) {
            console.error('EditorLiveTranscriptionService: Erreur lors de l\'upload:', error);
            return null;
        }
    }

    private async createTranscript(audioUrl: string): Promise<string | null> {
        try {
            const transcript = await this.client.transcripts.create({
                audio_url: audioUrl,
                language_detection: true
            });
            return transcript.id;
        } catch (error) {
            console.error('EditorLiveTranscriptionService: Erreur lors de la création de la transcription:', error);
            return null;
        }
    }

    private async pollTranscript(transcriptId: string): Promise<string | null> {
        try {
            const transcript = await this.client.transcripts.get(transcriptId);
            if (transcript.status === 'completed' && transcript.text) {
                return transcript.text;
            }
            return null;
        } catch (error) {
            console.error('EditorLiveTranscriptionService: Erreur lors de la récupération de la transcription:', error);
            return null;
        }
    }

    private insertText(text: string) {
        if (!this.currentEditor) return;

        const cursorPos = this.currentEditor.getCursor();
        this.currentEditor.replaceRange(
            text + '\n',
            cursorPos
        );
        this.currentEditor.setCursor({
            line: cursorPos.line + 1,
            ch: 0
        });
    }

    async startTranscription(editor: Editor): Promise<boolean> {
        if (this.isRecording) {
            new Notice('Une transcription est déjà en cours');
            return false;
        }

        if (!this.client) {
            new Notice('La clé API AssemblyAI n\'est pas configurée');
            return false;
        }

        this.currentEditor = editor;
        this.audioChunks = [];
        this.allAudioChunks = []; // Réinitialiser les chunks audio

        // Configurer le MediaRecorder
        if (!await this.setupMediaRecorder()) {
            return false;
        }

        try {
            this.isRecording = true;
            this.plugin?.setStatusBarText('Transcription en cours...');

            if (this.mediaRecorder) {
                this.mediaRecorder.ondataavailable = async (event: BlobEvent) => {
                    if (event.data.size > 0) {
                        this.audioChunks.push(event.data);
                        this.allAudioChunks.push(event.data); // Sauvegarder pour l'audio complet
                        
                        // Upload et transcription toutes les 5 secondes
                        if (this.audioChunks.length === 5) {
                            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                            const uploadUrl = await this.uploadAudioChunk(audioBlob);
                            
                            if (uploadUrl) {
                                const transcriptId = await this.createTranscript(uploadUrl);
                                if (transcriptId) {
                                    // Polling pour la transcription
                                    const checkTranscript = async () => {
                                        const text = await this.pollTranscript(transcriptId);
                                        if (text) {
                                            this.insertText(text);
                                        }
                                    };
                                    
                                    // Vérifier toutes les secondes pendant 30 secondes max
                                    let attempts = 0;
                                    const interval = setInterval(async () => {
                                        attempts++;
                                        await checkTranscript();
                                        if (attempts >= 30) {
                                            clearInterval(interval);
                                        }
                                    }, 1000);
                                }
                            }
                            
                            // Réinitialiser les chunks pour le prochain segment
                            this.audioChunks = [];
                        }
                    }
                };

                // Envoyer les données toutes les secondes
                this.mediaRecorder.start(1000);
                return true;
            }
        } catch (error) {
            console.error('EditorLiveTranscriptionService: Erreur de démarrage:', error);
            new Notice('Erreur lors du démarrage de la transcription');
            this.stopTranscription();
            return false;
        }

        return false;
    }

    private async saveAudioFile(): Promise<void> {
        if (this.allAudioChunks.length === 0) return;

        try {
            const audioBlob = new Blob(this.allAudioChunks, { type: 'audio/webm' });
            const arrayBuffer = await audioBlob.arrayBuffer();
            
            // Générer un nom de fichier avec la date
            const date = new Date();
            const fileName = `recordings/${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} - ${date.getHours()}h${String(date.getMinutes()).padStart(2, '0')}.webm`;
            
            // Créer le dossier recordings s'il n'existe pas
            const recordingsFolder = this.plugin?.app.vault.getAbstractFileByPath('recordings');
            if (!recordingsFolder) {
                await this.plugin?.app.vault.createFolder('recordings');
            }
            
            // Sauvegarder le fichier
            await this.plugin?.app.vault.createBinary(fileName, arrayBuffer);
            console.log('EditorLiveTranscriptionService: Audio sauvegardé:', fileName);
            new Notice(`Audio sauvegardé: ${fileName}`);
        } catch (error) {
            console.error('EditorLiveTranscriptionService: Erreur lors de la sauvegarde de l\'audio:', error);
            new Notice('Erreur lors de la sauvegarde de l\'audio');
        }
    }

    async stopTranscription() {
        if (!this.isRecording) return;

        console.log('EditorLiveTranscriptionService: Arrêt de la transcription');

        // Arrêter l'enregistrement
        if (this.mediaRecorder) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.mediaRecorder = null;
        }

        // Transcrire les derniers chunks si nécessaire
        if (this.audioChunks.length > 0) {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            const uploadUrl = await this.uploadAudioChunk(audioBlob);
            if (uploadUrl) {
                const transcriptId = await this.createTranscript(uploadUrl);
                if (transcriptId) {
                    // Attendre la dernière transcription
                    let attempts = 0;
                    while (attempts < 30) {
                        const text = await this.pollTranscript(transcriptId);
                        if (text) {
                            this.insertText(text);
                            break;
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        attempts++;
                    }
                }
            }
        }

        // Sauvegarder le fichier audio
        await this.saveAudioFile();

        this.audioChunks = [];
        this.allAudioChunks = [];
        this.isRecording = false;
        this.currentEditor = null;
        this.plugin?.setStatusBarText('');
        new Notice('Transcription terminée');
    }

    isTranscribing(): boolean {
        return this.isRecording;
    }
}
