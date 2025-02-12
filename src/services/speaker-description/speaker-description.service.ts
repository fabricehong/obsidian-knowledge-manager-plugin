import { AICompletionService } from "../interfaces/ai-completion.interface";

export class SpeakerDescriptionService {
    constructor(private llmService: AICompletionService) {}

    async describeSpeakers(transcriptContent: string): Promise<string> {
        const prompt = this.getSpeakerDescriptionPrompt();
        const messages = [
            {
                role: 'system' as const,
                content: prompt
            },
            {
                role: 'user' as const,
                content: transcriptContent
            }
        ];
        return await this.llmService.generateTextResponse(messages);
    }

    private getSpeakerDescriptionPrompt(): string {
        return `Analyse la conversation suivante et décris chaque intervenant (Speaker A, Speaker B, etc.) en te concentrant sur :
1. Son rôle apparent dans la réunion
2. Son entreprise probable si mentionnée ou déduite
3. Les prénoms qu'il mentionne (qui sont probablement d'autres personnes)
4. Son expertise ou domaine de compétence visible dans ses interventions
5. Son style d'intervention (technique, business, management, etc.)

Format de réponse souhaité:
Speaker A:
- Rôle: [rôle dans la réunion]
- Entreprise probable: [nom si identifiable]
- Mentionne: [liste des prénoms]
- Expertise: [domaines]
- Style: [description du style]

[Commentaire sur la dynamique entre les speakers si pertinent]`;
    }
}
