import { AICompletionService } from '../interfaces/ai-completion.interface';

export class ConversationTopicsService {
    private readonly SYSTEM_PROMPT = `Ta tâche va être de lister tous les sujets de conversations abordés dans la conversation qui suit, et formatte les dans un mindmap tab indented (indentation par tabs et non par espaces, pas de tirets, pas de retours à la ligne inutiles). Le mindmap être très structuré (par opposition à une liste à plat). Réponds dans un bloc de code.
Exemple:
\`\`\`
Réunion sur les systèmes de gestion des données et des ventes
	Impact des changements de systèmes
		Exemples de sacrifices adoptés par TPG
		Complexité de la gestion des données
		Optimisation et suppression de couches intermédiaires
	Problèmes techniques et formation
		Complexité technique des systèmes actuels
		Formation des employés
		Service après-vente et support client
\`\`\`
`;

    constructor(private aiCompletionService: AICompletionService) {}

    async listTopics(transcription: string): Promise<string> {
        const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
            { role: 'system', content: this.SYSTEM_PROMPT },
            { role: 'assistant', content: 'OK' },
            { role: 'user', content: transcription }
        ];
        console.log('starting to generate topics list');
        const response = await this.aiCompletionService.generateTextResponse(messages);
        console.log('topics list generated');
        console.log(response);
        return response;
    }
}
