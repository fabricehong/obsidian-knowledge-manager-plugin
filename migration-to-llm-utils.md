# Migration vers llm-utils

## Objectif

L'objectif de cette migration est de déplacer tous les services liés aux LLM (Large Language Models) dans une bibliothèque partagée `llm-utils`. Cette bibliothèque pourra être réutilisée par d'autres plugins Obsidian, évitant ainsi la duplication de code et facilitant la maintenance.

## Structure de la bibliothèque

La bibliothèque est organisée comme suit :

```
llm-utils/
├── src/
│   ├── services/
│   │   ├── llm/
│   │   │   ├── langchain-completion.service.ts
│   │   │   └── model.factory.ts
│   │   └── interfaces/
│   │       └── ai-completion.interface.ts
│   ├── types/
│   │   └── llm-settings.types.ts
│   ├── editor/
│   ├── ui/
│   └── utils/
```

## Services déjà migrés

- ✅ `LangChainCompletionService` : Service principal pour l'interaction avec les modèles LangChain
- ✅ `ModelFactory` : Factory pour créer les différents modèles de chat (OpenAI, DeepSeek, etc.)
- ✅ `AICompletionService` (interface) : Interface définissant le contrat pour les services de complétion

## Services à migrer

- ⏳ `LLMCompletionService` : Service de base pour l'interaction avec OpenAI
- ⏳ `OpenAIModelService` : Service spécifique pour OpenAI
- ⏳ Autres services LLM potentiels à identifier

## Dépendances

La bibliothèque utilise les peer dependencies suivantes pour éviter les duplications :

```json
{
  "peerDependencies": {
    "obsidian": "latest",
    "zod": "^3.x.x",
    "@langchain/core": "^0.x.x",
    "@langchain/openai": "^0.x.x",
    "@langchain/deepseek": "^0.x.x",
    "@langchain/groq": "^0.x.x",
    "@langchain/google-genai": "^0.x.x"
  }
}
```

## Processus de migration

1. Identifier les services à migrer
2. Créer une structure appropriée dans `llm-utils`
3. Déplacer le code vers la nouvelle structure
4. Mettre à jour les imports dans le plugin principal
5. Vérifier que tout compile
6. Supprimer les fichiers originaux

## Points d'attention

- Ne pas oublier de mettre à jour les chemins d'import dans tous les fichiers qui utilisent les services migrés
- Maintenir la compatibilité avec les interfaces existantes
- Vérifier que les services migrés n'ont pas de dépendances circulaires
- S'assurer que les types sont correctement exportés
- Garder la bibliothèque indépendante du plugin principal

## Prochaines étapes

1. Identifier d'autres services LLM à migrer
2. Évaluer si certains services connexes (comme les services d'édition) devraient aussi être migrés
3. Mettre en place des tests pour la bibliothèque
4. Documenter l'API publique de la bibliothèque
5. Créer des exemples d'utilisation

## Notes techniques

- La bibliothèque est importée avec le préfixe `@llm-utils/`
- Les imports doivent être mis à jour en conséquence (ex: `import { AICompletionService } from '@llm-utils/services/interfaces/ai-completion.interface'`)
- Les services qui dépendent d'Obsidian doivent être gardés dans le plugin principal
- La bibliothèque ne doit pas avoir de dépendances directes avec le plugin principal
