# Guide de Documentation de Répertoire pour Windsurf

## ⚠️ Prérequis Important

Avant de commencer la documentation d'un répertoire :
1. Lisez ce guide dans son intégralité
2. Suivez la méthodologie d'analyse dans l'ordre indiqué
3. Utilisez la checklist de validation avant de finaliser

## Emplacement et Nom du Fichier
La documentation d'un répertoire doit être créée dans le répertoire lui-même, avec le nom `${folder_name}_documentation.md`.

Par exemple :
- Pour le répertoire `/src/services/replacement`, créer `/src/services/replacement/replacement_documentation.md`
- Pour le répertoire `/src/models`, créer `/src/models/models_documentation.md`

## Méthodologie d'Analyse

La qualité de la documentation dépend d'une analyse approfondie de l'architecture. Suivez ces étapes dans l'ordre :

1. **Analyse des Points d'Entrée**
   - Examiner le `ServiceContainer` pour comprendre :
     - Comment les services sont injectés
     - L'ordre d'initialisation
     - Les dépendances entre services
   - Identifier les points d'entrée dans `main.ts`
   - Noter les commandes ou événements qui déclenchent les services

2. **Analyse des Dépendances**
   - Pour chaque service identifié :
     - Noter ses dépendances directes
     - Comprendre pourquoi ces dépendances sont nécessaires
     - Identifier les flux de données entre les services
   
3. **Identification des Services**
   - Rechercher tous les fichiers de service dans le répertoire
   - Exclure les fichiers de test (*.spec.ts)
   - Noter les noms et chemins des fichiers principaux

4. **Collecte des JavaDocs**
   - Pour chaque service :
     - Examiner la documentation de classe
     - Extraire les responsabilités principales
     - Vérifier la cohérence avec les dépendances identifiées

## Structure du Document Final

Une fois l'analyse terminée, organisez la documentation en trois sections :

1. **Vue d'ensemble**
   - Description concise du rôle du répertoire
   - Objectif général des services
   - Contexte d'utilisation dans l'application
   - Points d'entrée principaux

2. **Services et leurs responsabilités**
   - Pour chaque service :
     - Nom avec lien vers le fichier
     - Description basée sur la JavaDoc
     - Responsabilités principales
     - Dépendances clés

3. **Flux typiques**
   - Pour chaque flux principal :
     - Point d'entrée (commande/événement)
     - Séquence d'interactions entre services
     - Données échangées
     - Résultat final

## Checklist de Validation

Avant de finaliser la documentation, vérifiez que :

- [ ] Le ServiceContainer a été analysé en détail
- [ ] Tous les points d'entrée sont documentés
- [ ] Les dépendances entre services sont claires
- [ ] Chaque service a une description complète
- [ ] Les flux incluent les données échangées
- [ ] Les liens vers les fichiers sont corrects

## Format des Liens

Pour les références aux fichiers, utiliser :
```markdown
[NomService](chemin/vers/fichier.ts)
```

## Exemples

### Exemple d'Analyse de Dépendances
```markdown
ServiceA
├── Dépend de ServiceB pour [raison]
└── Utilisé par ServiceC pour [cas d'usage]
```

### Exemple de Section Service
```markdown
### ServiceName
Service responsable de [description].

Dépendances :
- ServiceA : Pour [raison]
- ServiceB : Pour [raison]

Responsabilités :
- Responsabilité 1
- Responsabilité 2
```

### Exemple de Section Flux
```markdown
### Flux de Remplacement de Texte
1. Déclencheur : Commande "Remplacer texte"
2. EditorService : Capture le texte sélectionné
3. ValidationService : Vérifie les règles
   - Données : {texte, règles}
4. TransformationService : Applique les changements
   - Résultat : Texte modifié
