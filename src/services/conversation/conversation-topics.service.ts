import { AICompletionService } from '@obsidian-utils/services/interfaces/ai-completion.interface';

export class ConversationTopicsService {
    private readonly SYSTEM_PROMPT = `Tu vas recevoir deux éléments : 
1. Des instructions de l'utilisateur sur le format de sortie attendu
2. Un texte à traiter selon ces instructions

Applique les instructions de l'utilisateur sur le texte fourni et retourne le résultat.`;

    constructor(private aiCompletionService: AICompletionService) {}

    async listTopics(transcription: string, userPrompt: string): Promise<string> {
        const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
            { role: 'system', content: this.SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
            { role: 'user', content: `Voici le contenu à traiter :

${transcription}` }
        ];
        console.log('starting to generate topics list');
        const response = await this.aiCompletionService.generateTextResponse(messages);
        console.log('topics list generated');
        console.log(response);
        return response;
    }
}
