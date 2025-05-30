---
trigger: model_decision
---

## Organisation des fichiers
- **Prompts** : toujours déclarés en haut du fichier (system, human, etc.)
- **Schemas** : schémas Zod d'input/output immédiatement après les prompts
- **Tools** : chaque tool est une factory LCEL pure (prompt → LLM → outputParser → tool)
- **Agents** : instanciés via des initializers/factories, jamais "en dur"
- **Factories** : pattern registry pour enregistrer tous les agents connus
- **Ordre recommandé dans chaque fichier** :
  1. Prompts
  2. Schémas (Zod)
  3. Tools/factories
  4. Agents
  5. Export

## Patterns et conventions LangChain/LCEL
- **LCEL obligatoire** : composez les chaînes avec `.pipe()` (prompt → LLM → outputParser)
- **Support de l'historique** : utilisez `RunnableWithMessageHistory` et `MessagesPlaceholder` pour toute chaîne conversationnelle
- **Utilisation de Zod** : tous les inputs/outputs structurés doivent être validés via Zod
- **Injection de dépendances** : services et LLM sont injectés dans les constructeurs, jamais instanciés "à la main" dans les agents/tools
- **Nommage** :
  - Tools : `*.tool.ts`
  - Agents : `*-agent.initializer.ts`
  - Factories : `*.factory.ts`
- **Documentation** : commentez chaque section clé (docstring, exemples dans les prompts, etc.)

## Tests et intégration
- **Tests d'intégration** : doivent réutiliser la stack réelle (pas de mocks de logique métier)
- **Séparation claire** : prompts, outils, agents, factories, tests
- **Structure modulaire** : chaque composant a une responsabilité unique

## Fichiers de référence
- `src/services/chat/tools/search-vault.tool.ts`  \
  _Exemple de Tool LangChain/LCEL bien structuré : prompts en haut, schémas Zod, factory pure, composition LCEL, typage fort, injection de dépendances._
- `src/services/chat/agent-tracing-lcel.spec.ts`  \
  _Exemple de test d'intégration complet : simulateur de service, tool, agent, tracing, organisation modulaire._

## À éviter
- Pas d'instanciation directe de LLM ou services dans les agents/tools
- Pas de prompts ou schémas "en dur" dans le corps d'une fonction

---

## Pour toute nouvelle implémentation ou refactorisation
- S'inspirer des fichiers de référence listés ci-dessus
- Respecter l'ordre et la structure recommandés
- Appliquer systématiquement les patterns LCEL, l'injection de dépendances et la validation forte via Zod
- Documenter les choix architecturaux spécifiques dans le fichier concerné

---

**Ces règles sont obligatoires pour tout développement LangChain/LCEL dans ce workspace.**