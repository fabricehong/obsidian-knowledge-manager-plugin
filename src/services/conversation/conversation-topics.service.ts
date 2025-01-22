import { AICompletionService } from '../interfaces/ai-completion.interface';

export class ConversationTopicsService {
    private readonly SYSTEM_PROMPT = `Ta tâche va être de lister tous les sujets de conversations abordés dans la conversation qui suit, et formatte les dans un mindmap tab indented (indentation par tabs et non par espaces, pas de tirets, pas de retours à la ligne inutiles). Réponds dans un bloc de code.`;

    constructor(private aiCompletionService: AICompletionService) {}

    async listTopics(transcription: string): Promise<string> {
        const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
            { role: 'system', content: this.SYSTEM_PROMPT },
            { role: 'assistant', content: 'OK' },
            { role: 'user', content: transcription }
        ];

        return await this.aiCompletionService.generateTextResponse(messages);
    }
}
