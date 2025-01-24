# Documentation du Répertoire Replacement

## Vue d'ensemble
Le répertoire `replacement` est responsable de la gestion des remplacements de texte dans l'éditeur Obsidian. Il fournit des services pour manipuler et transformer le texte selon différentes règles, notamment pour la transcription et la gestion des métadonnées YAML.

### Objectif général
- Fournir une infrastructure robuste pour le remplacement de texte dans l'éditeur
- Gérer les règles de transcription et leur application
- Maintenir des statistiques sur les remplacements effectués
- Gérer les métadonnées YAML des documents

### Points d'entrée principaux
- Commandes d'édition via `EditorTranscriptionReplacementService`
- Manipulation de YAML via `YamlService`
- Gestion du glossaire via `GlossaryReplacementService`

## Services et leurs responsabilités

### [EditorTranscriptionReplacementService](editor-transcription-replacement.service.ts)
Service principal pour l'interaction avec l'éditeur Obsidian.

Dépendances :
- `App` : Pour l'interaction avec l'API Obsidian
- `TranscriptionReplacementService` : Pour les règles de remplacement
- `DocumentStructureService` : Pour l'analyse de structure
- `YamlService` : Pour la gestion des spécifications de remplacement

Responsabilités :
- Gérer les interactions avec l'éditeur Obsidian
- Appliquer les remplacements de texte
- Coordonner les différents services de remplacement

### [TranscriptionReplacementService](transcription-replacement.service.ts)
Service central pour la logique de remplacement.

Responsabilités :
- Implémenter la logique de base des remplacements
- Gérer les règles de transcription
- Fournir des méthodes de transformation de texte

### [YamlService](yaml.service.ts)
Service pour la gestion des métadonnées YAML.

Responsabilités :
- Parser et valider les spécifications YAML
- Gérer les schémas de validation
- Fournir une interface type-safe pour les spécifications

### [GlossaryReplacementService](glossary-replacement.service.ts)
Service pour la gestion des remplacements basés sur le glossaire.

Responsabilités :
- Gérer les remplacements basés sur le glossaire
- Appliquer les règles de remplacement spécifiques au glossaire

### [ReplacementStatisticsService](replacement-statistics.service.ts)
Service pour le suivi des statistiques de remplacement.

Responsabilités :
- Collecter des statistiques sur les remplacements effectués
- Fournir des métriques sur l'utilisation des règles

## Flux typiques

### Flux de remplacement de transcription
1. Déclencheur : Commande de remplacement dans l'éditeur
2. `EditorTranscriptionReplacementService` :
   - Capture le texte sélectionné
   - Récupère les règles de remplacement via `YamlService`
3. `TranscriptionReplacementService` :
   - Applique les règles de remplacement
   - Transforme le texte selon les spécifications
4. Résultat : Texte modifié dans l'éditeur

### Flux de gestion YAML
1. Déclencheur : Lecture/écriture de spécifications
2. `YamlService` :
   - Parse le contenu YAML
   - Valide contre le schéma approprié
3. Résultat : Spécifications validées disponibles pour les services
