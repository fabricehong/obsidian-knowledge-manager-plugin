import { AICompletionService } from "../../libs/obsidian-utils/src/services/interfaces/ai-completion.interface";

export interface FileResult {
    fileName: string;
    content: string;
}

export class InformationSynthesisSummaryService {
    constructor(private aiCompletionService: AICompletionService) {}

    async synthesizeByTopic(question: string, filePaths: string[], fileResults: FileResult[]): Promise<string> {
        const systemPrompt = `# Tâche
Tu dois créer une synthèse structurée et claire des informations de recherche fournies.

Les informations ont été collectées à partir de plusieurs fichiers pour répondre à la question initiale, mais elles sont actuellement organisées par fichier source. Ta tâche est de les réorganiser par sujets/thèmes logiques pour faciliter la compréhension.

## Instructions détaillées

1. **Organisation thématique** : Réorganise les informations par sujets cohérents plutôt que par fichiers
2. **Clarté et structure** : Utilise un format markdown avec des headers clairs et une hiérarchie logique
3. **Références aux sources** : Pour chaque information importante, indique le fichier source entre crochets doubles en utilisant EXACTEMENT le nom tel qu'il apparaît dans la liste "Fichiers consultés" ci-dessous. Format : [[nom-exact-du-fichier]]
4. **Synthèse focalisée** : Garde le focus sur la question initiale et évite les informations non pertinentes
5. **Citations précises** : Quand tu cites du contenu, assure-toi que ce soit exact et indique la source
6. **Pas de répétitions** : Évite de répéter les mêmes informations si elles apparaissent dans plusieurs fichiers
7. **Cohérence des références** : Utilise toujours les noms de fichiers EXACTEMENT comme listés dans "Fichiers consultés", sans abréviations, modifications ou paraphrases

## Format attendu
- **Structure hiérarchique** : Commence tes headers au niveau 2 (##) car ton contenu sera inséré sous un header de niveau 1 déjà existant
- **Organisation** : Utilise ## pour les thèmes principaux, ### pour les sous-thèmes, #### pour les détails
- **IMPORTANT** : Ne pas répéter le titre de la section, commence directement par les thèmes de contenu
- **Exemple de structure attendue** :
  ## Premier thème principal
  Contenu du thème avec explications détaillées...
  
  ### Sous-aspect du premier thème
  Détails spécifiques...
  
  ## Deuxième thème principal
  Contenu du deuxième thème...
  
  ### Sous-aspect du deuxième thème
  Autres détails...
  
  ## Troisième thème principal
  Contenu du troisième thème...
- Chaque section thématique doit être autonome et compréhensible
- Inclure une introduction brève si nécessaire
- Conclure par une synthèse ou des points clés si approprié

**IMPORTANT** : Ne jamais utiliser de header de niveau 1 (#) dans ta réponse, commence toujours par le niveau 2 (##)

## Exemple de référencement correct
Si la liste "Fichiers consultés" contient "- [[2025-01-14(1) - point Jessica sur filtrage OD]]", alors tu dois écrire :
[[2025-01-14(1) - point Jessica sur filtrage OD]]

JAMAIS des variantes comme [[point Jessica]] ou [[meeting du 14 janvier]] ou autres paraphrases.
IMPORTANT : Utilise le nom du fichier tel qu'il apparaît EXACTEMENT entre les crochets doubles [[...]] dans la liste "Fichiers consultés".

Rappel : Le but est d'avoir une vue d'ensemble claire et structurée qui répond à la question initiale de manière plus organisée qu'une simple liste de réponses par fichier.`;

        const fileResultsText = fileResults
            .map(fr => `### ${fr.fileName}\n${fr.content}`)
            .join('\n\n');

        const filePathsList = filePaths
            .map(path => `- [[${path}]]`)
            .join('\n');

        const messages = [
            { 
                role: 'system' as const, 
                content: systemPrompt
            },
            { 
                role: 'user' as const, 
                content: `Question initiale : ${question}

Fichiers consultés :
${filePathsList}

Résultats par fichier à synthétiser :

${fileResultsText}` 
            }
        ];
        
        return await this.aiCompletionService.generateTextResponse(messages);
    }
}