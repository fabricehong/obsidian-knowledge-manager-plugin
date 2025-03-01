import { AICompletionService } from '@obsidian-utils/services/interfaces/ai-completion.interface';

export class DocumentationService {
    constructor(private aiCompletionService: AICompletionService) {}

    private readonly SYSTEM_PROMPT = `# Tâche
À partir d'une transcription de meeting, tu dois documenter en détail les aspects importants listés dans mon mindmap, que je fournirai dans un format indenté par tabulation.

Le mindmap sert de liste de points obligatoires et de guide de sens, où la hiérarchie des éléments clarifie les relations et le contexte des mots-clés.

Ton objectif est de créer une documentation bien structurée, cohérente et fluide, où chaque aspect est bien articulé et explicité.
La structure finale de la documentation ne doit pas nécessairement suivre celle du mindmap ; tu as toute la liberté de réorganiser l’information pour qu’elle soit logique et facile à lire.
Les titres de section doivent être pertinents et adaptés à l’organisation que tu choisis.

# Exigences spécifiques
- **Contenu obligatoire** : tous les éléments présents dans le mindmap doivent être intégrés à la documentation. Le mindmap ne doit pas dicter la structure finale mais sert à garantir que chaque point est couvert.
- **Contexte et fluidité** : ajoute des informations contextuelles pertinentes autour de chaque aspect pour introduire et articuler naturellement le contenu documenté, même si elles ne sont pas explicitement mentionnées dans le mindmap.
- **Titres** : trouve des titres clairs et pertinents pour les sections de la documentation afin de bien organiser le contenu. Les titres ne doivent pas se limiter aux mots-clés du mindmap mais doivent refléter la structure choisie.
- Ne mets pas de numérotation dans les headers de ta documentation
- concernant le contenu des offres (Stratégies d'Offres et de Division de celles-ci), il est important de lister toutes les fonctionnalités trouvées dans le mindmap

# Format de sortie
Réponds uniquement avec la documentation produite, sans autres mots ajoutés. La documentation doit être fournie en format Markdown.`;

    async createDocumentation(transcription: string, mindmap: string): Promise<string> {
        const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
            { role: 'system', content: this.SYSTEM_PROMPT },
            { role: 'user', content: `Voici la transcription:\n${transcription}` },
            { role: 'user', content: `Voici le mindmap:\n${mindmap}` }
        ];

        return await this.aiCompletionService.generateTextResponse(messages);
    }
}
