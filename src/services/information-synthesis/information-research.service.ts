import { AICompletionService } from "../../libs/obsidian-utils/src/services/interfaces/ai-completion.interface";

export class InformationResearchService {
    constructor(private aiCompletionService: AICompletionService) {}

    async researchInformation(question: string, content: string): Promise<string> {
        const systemPrompt = `# Tâche
En te basant UNIQUEMENT sur la transcription de meeting fournie, tu dois répondre à la question posée.

Pour tes réponses, tu privilégieras les détails logiques et factuels plutôt que les phrases à rallonge (phrases introductives, conclusions) qui n'apportent pas de vraies informations.

Pour chaque réponse que tu fourniras, tu citeras des parties de textes issues de la transcription (attention cela doit être le texte original sans modification, afin que l'utilisateur puisse le retrouver), qui t'ont permis de déduire ce que tu avances. Il sera important de préciser la personne qui a dit les phrases ou parties de textes.

Si tu ne trouves pas d'information pertinente dans la transcription pour répondre à la question, indique-le clairement.`;

        const messages = [
            { 
                role: 'system' as const, 
                content: systemPrompt
            },
            { 
                role: 'user' as const, 
                content: `Question : ${question}

Transcription du meeting :
${content}` 
            }
        ];
        
        return await this.aiCompletionService.generateTextResponse(messages);
    }
}