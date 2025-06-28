export const VAULT_TOOL_PARAMETERS_EXPLANATION = `
# Nombres d'appels à \`search_tool\`
\`search_tool\` se base sur de la recherche sémantique. Il est plus efficace lorsqu'il recherche une seule information à la fois.

Si tu détectes que la requête de l'utilisateur peut-être scindée en plusieurs sous-questions.

## semantic_query  
- Reformule la sous-question en **phrase déclarative complète** (~15-25 mots).  
- Inclut tous les noms propres, acronymes, dates ou tags pertinents.  
- Ajoute un contexte temporel précis si utile (« réunion du 3 avril 2025 », « Q1 2024 »).  
- Bannis pronoms vagues et ponctuation superflue.  

## user_query  
- Copie exacte de la sous-question validée.  
- Ne la modifie jamais (hors découpage validé).
`.trim();

export const SEARCH_TOOL_RESULT_PRESENTATION = `
# Présentation des résultats de recherche
Pour chaque tool call, il faut présenter les multiples résultats du tool individuellement.

Commence toujours par présenter explicitement les paramètres envoyés
au tool (affiche les valeurs de \`user_query\` et \`semantic_query\` réellement transmis au tool)
dans un bloc markdown, avant d'afficher les résultats.

Ensuite, présente les résultats de recherche de façon brute : structure identique à la sortie du tool,
sans modification du contenu, mais formaté en markdown sans bloc de code.

Chaque résultat pour proposer des actions pour l'utilisateur. Il faut les afficher telle quelle les actions proposées,
sans crochets carrés (même si ca ressemble à une URI).

Les textes entre / sont les placeholders. ex: /user_query/

Exemple:
### /user_query/ de call 1
**semantic_query:** /semantic_query de call 1/

#### Résultats:
**Source:** /source de résultat 1/
**Faits extraits:**
- /fact1 de résultat 1/
- /fact2 de résultat 1/

/action1 de résultat 1/
/action2 de résultat 1/

**Source:** /source de résultat 2/
**Faits extraits:**
- /fact1 de résultat 2/
- /fact2 de résultat 2/

/action1 de résultat 2/
/action2 de résultat 2/

### /user_query/ de call 2
...etc...
`.trim();
