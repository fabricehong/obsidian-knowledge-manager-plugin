# Documentation pour la création d'un outil LangChain.js avec traitement LLM intégré

Cette documentation présente une architecture avancée permettant de créer un outil LangChain.js qui effectue une recherche, traite les résultats via un LLM secondaire, et retourne des données structurées à l'agent principal. L'objectif principal est d'optimiser l'utilisation du contexte en filtrant et structurant les informations avant de les transmettre à l'agent principal, évitant ainsi la surcharge informationnelle qui peut nuire aux performances et à la précision des réponses.

## Architecture et concepts fondamentaux

L'architecture proposée repose sur une approche en couches où un outil personnalisé fait appel à des fonctions de recherche, puis utilise un LLM secondaire pour traiter et structurer les résultats. Cette approche permet de séparer les responsabilités : l'agent principal se concentre sur la logique métier et la conversation, tandis que l'outil spécialisé gère l'extraction et la structuration des informations.

Les outils dans LangChain.js sont des abstractions qui encapsulent une fonction TypeScript avec un schéma définissant le nom, la description et les paramètres d'entrée[1]. La fonction `tool` de LangChain.js simplifie considérablement la création d'outils personnalisés en permettant de définir facilement des outils qui retournent des artefacts et en supportant les arguments injectés[1]. Cette approche moderne remplace les méthodes plus complexes comme l'héritage de la classe `StructuredTool`[1].

L'interface `StructuredToolInterface` définit la forme d'un outil LangChain structuré, qui utilise un schéma pour définir la structure des arguments que le LLM génère dans ses appels d'outils[3]. Cette interface garantit que les outils respectent les contrats attendus par l'agent principal et peuvent être correctement intégrés dans le flux de traitement.

## Création d'un outil LangChain.js de base

La création d'un outil personnalisé commence par l'importation des modules nécessaires et la définition du schéma d'entrée. Voici la structure de base pour créer un outil de recherche avec traitement LLM intégré :

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";

// Définition du schéma d'entrée pour l'outil
const searchToolSchema = z.object({
  query: z.string().describe("Requête de recherche à exécuter"),
  maxResults: z.number().optional().default(10).describe("Nombre maximum de résultats à retourner"),
  filters: z.object({
    dateRange: z.string().optional(),
    category: z.string().optional(),
    language: z.string().optional().default("fr")
  }).optional().describe("Filtres optionnels pour la recherche")
});

// Schéma de sortie structurée
const structuredOutputSchema = z.object({
  relevantInformation: z.array(z.object({
    title: z.string(),
    summary: z.string(),
    relevanceScore: z.number().min(0).max(1),
    source: z.string(),
    extractedFacts: z.array(z.string())
  })),
  keyInsights: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  recommendedActions: z.array(z.string()).optional()
});
```

La fonction de recherche peut être implémentée selon vos besoins spécifiques. Voici un exemple générique qui peut être adapté à différentes sources de données :

```typescript
async function performSearch(query: string, options: any): Promise {
  // Implémentation de votre fonction de recherche
  // Ceci peut être une API externe, une base de données, etc.
  try {
    // Exemple d'appel API
    const response = await fetch(`https://api.example.com/search?q=${encodeURIComponent(query)}&limit=${options.maxResults}`);
    const data = await response.json();
    
    return data.results || [];
  } catch (error) {
    console.error("Erreur lors de la recherche:", error);
    return [];
  }
}
```

## Intégration d'un LLM secondaire pour le traitement

L'élément clé de cette architecture est l'intégration d'un LLM secondaire qui traite les résultats bruts de la recherche. Ce LLM est configuré avec un prompt spécialisé pour extraire et structurer les informations pertinentes :

```typescript
async function processSearchResults(rawResults: any[], originalQuery: string): Promise {
  // Initialisation du LLM secondaire
  const processingLLM = new ChatOpenAI({
    model: "gpt-4-turbo-preview",
    temperature: 0.1, // Faible température pour des résultats plus déterministes
  });

  // Prompt spécialisé pour le traitement
  const processingPrompt = `
Tu es un assistant spécialisé dans l'extraction et la structuration d'informations.
Ta tâche est d'analyser les résultats de recherche suivants et d'extraire uniquement les informations les plus pertinentes.

Requête originale: "${originalQuery}"

Résultats de recherche:
${JSON.stringify(rawResults, null, 2)}

Instructions:
1. Identifie les informations les plus pertinentes par rapport à la requête
2. Résume chaque élément pertinent en gardant les faits essentiels
3. Attribue un score de pertinence entre 0 et 1
4. Extrais les insights clés qui répondent à la requête
5. Propose des actions recommandées si approprié

Retourne un objet JSON respectant exactement cette structure:
{
  "relevantInformation": [
    {
      "title": "string",
      "summary": "string",
      "relevanceScore": number,
      "source": "string",
      "extractedFacts": ["string"]
    }
  ],
  "keyInsights": ["string"],
  "confidence": number,
  "recommendedActions": ["string"]
}
`;

  try {
    const result = await processingLLM.invoke(processingPrompt);
    
    // Parse le JSON retourné par le LLM
    const parsedResult = JSON.parse(result.content as string);
    
    // Validation du schéma de sortie
    return structuredOutputSchema.parse(parsedResult);
  } catch (error) {
    console.error("Erreur lors du traitement par le LLM:", error);
    throw new Error("Impossible de traiter les résultats de recherche");
  }
}
```

## Création de l'outil complet avec traitement intégré

Maintenant, nous assemblons tous les composants pour créer l'outil complet qui combine recherche et traitement LLM :

```typescript
const intelligentSearchTool = tool(
  async (input: z.infer) => {
    try {
      // Étape 1: Exécution de la recherche
      console.log(`Exécution de la recherche pour: "${input.query}"`);
      const rawResults = await performSearch(input.query, {
        maxResults: input.maxResults,
        filters: input.filters
      });

      if (rawResults.length === 0) {
        return {
          relevantInformation: [],
          keyInsights: ["Aucun résultat trouvé pour cette recherche"],
          confidence: 0,
          recommendedActions: ["Essayer une requête différente ou plus générale"]
        };
      }

      // Étape 2: Traitement par le LLM secondaire
      console.log(`Traitement de ${rawResults.length} résultats par le LLM...`);
      const processedResults = await processSearchResults(rawResults, input.query);

      // Étape 3: Ajout de métadonnées
      const finalResult = {
        ...processedResults,
        metadata: {
          totalRawResults: rawResults.length,
          processedAt: new Date().toISOString(),
          query: input.query,
          processingTime: Date.now()
        }
      };

      console.log(`Recherche complétée. ${processedResults.relevantInformation.length} informations pertinentes extraites.`);
      return finalResult;

    } catch (error) {
      console.error("Erreur dans l'outil de recherche intelligente:", error);
      throw new Error(`Échec de la recherche intelligente: ${error.message}`);
    }
  },
  {
    name: "intelligent_search",
    description: "Effectue une recherche intelligente et retourne uniquement les informations les plus pertinentes, traitées et structurées par IA",
    schema: searchToolSchema,
  }
);
```

## Intégration avec l'agent principal

Pour utiliser cet outil avec votre agent principal, voici comment procéder :

```typescript
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

// Configuration de l'agent principal
const mainLLM = new ChatOpenAI({
  model: "gpt-4-turbo-preview",
  temperature: 0.7,
});

// Création de l'agent avec l'outil intégré
const agent = createReactAgent({
  llm: mainLLM,
  tools: [intelligentSearchTool],
  // Autres outils selon vos besoins
});

// Utilisation de l'agent
async function runAgentWithIntelligentSearch() {
  const result = await agent.invoke({
    messages: [{
      role: "user",
      content: "Peux-tu rechercher des informations sur les dernières innovations en IA générative et me donner un résumé structuré?"
    }]
  });
  
  console.log("Résultat de l'agent:", result);
}
```

## Optimisations et bonnes pratiques
class SearchCache {
  private cache = new Map();
  private readonly TTL = 3600000; // 1 heure en millisecondes

  generateKey(query: string, options: any): string {
    return `${query}_${JSON.stringify(options)}`;
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp  {
  const maxRetries = 3;
  let lastError: Error;

  for (let attempt = 1; attempt  setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // Fallback: retourner une structure minimale
  return {
    relevantInformation: [],
    keyInsights: [`Erreur lors de la recherche: ${lastError.message}`],
    confidence: 0,
    recommendedActions: ["Réessayer avec une requête différente"]
  };
}
```

### Validation et sécurité

Ajoutez des validations strictes pour sécuriser votre outil :

```typescript
function validateSearchInput(input: any): void {
  // Validation de la longueur de la requête
  if (!input.query || input.query.length > 500) {
    throw new Error("La requête doit faire entre 1 et 500 caractères");
  }

  // Validation des caractères dangereux
  const dangerousPatterns = [//i, /javascript:/i, /onload=/i];
  if (dangerousPatterns.some(pattern => pattern.test(input.query))) {
    throw new Error("Requête contenant des caractères non autorisés");
  }

  // Limitation du taux de requêtes
  if (input.maxResults > 100) {
    input.maxResults = 100;
  }
}
```

## Monitoring et observabilité

Pour maintenir la qualité de votre outil en production, implémentez un système de monitoring :

```typescript
class ToolMetrics {
  private metrics = {
    totalCalls: 0,
    successfulCalls: 0,
    averageProcessingTime: 0,
    errorsByType: new Map()
  };

  recordCall(success: boolean, processingTime: number, error?: Error): void {
    this.metrics.totalCalls++;
    if (success) {
      this.metrics.successfulCalls++;
    }
    
    // Calcul de la moyenne mobile
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.totalCalls - 1) + processingTime) / this.metrics.totalCalls;

    if (error) {
      const errorType = error.constructor.name;
      this.metrics.errorsByType.set(errorType, (this.metrics.errorsByType.get(errorType) || 0) + 1);
    }
  }

  getSuccessRate(): number {
    return this.metrics.totalCalls > 0 ? this.metrics.successfulCalls / this.metrics.totalCalls : 0;
  }

  getMetrics(): any {
    return {
      ...this.metrics,
      successRate: this.getSuccessRate(),
      errorsByType: Object.fromEntries(this.metrics.errorsByType)
    };
  }
}
```

## Conclusion

Cette architecture permet de créer un outil LangChain.js sophistiqué qui optimise l'utilisation du contexte en filtrant et structurant intelligemment les informations de recherche[1]. L'approche modulaire sépare clairement les responsabilités entre la recherche brute, le traitement par LLM, et la structuration des données. Cette séparation améliore la maintenabilité du code et permet d'optimiser chaque composant indépendamment. L'intégration d'un LLM secondaire spécialisé dans le traitement des données permet d'obtenir des résultats plus précis et pertinents, tout en préservant les ressources de l'agent principal pour les tâches de haut niveau. Les bonnes pratiques présentées, incluant la gestion d'erreurs, la mise en cache, et le monitoring, garantissent la robustesse et la performance de la solution en environnement de production.