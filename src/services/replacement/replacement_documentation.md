# Documentation du Répertoire Replacement

## Vue d'ensemble
Le répertoire `replacement` est responsable de la gestion des remplacements de texte dans l'éditeur Obsidian. Il fournit des services pour manipuler et transformer le texte selon différentes règles, notamment pour la transcription et la gestion des métadonnées YAML.

### Objectif général
- Fournir une infrastructure robuste pour le remplacement de texte dans l'éditeur
- Gérer les règles de transcription et leur application
- Maintenir des statistiques sur les remplacements effectués

### Points d'entrée principaux
- Commandes d'édition via `EditorTranscriptionReplacementService`
- Gestion du glossaire via `GlossaryReplacementService`

## Services et leurs responsabilités

### [EditorTranscriptionReplacementService](apply-replacement/editor-transcription-replacement.service.ts)
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

### [TranscriptionReplacementService](apply-replacement/transcription-replacement.service.ts)
Service central pour la logique de remplacement.

Responsabilités :
- Implémenter la logique de base des remplacements
- Gérer les règles de transcription
- Fournir des méthodes de transformation de texte

### [ReplacementStatisticsService](apply-replacement/replacement-statistics.service.ts)
Service pour le suivi des statistiques de remplacement.

Responsabilités :
- Collecter des statistiques sur les remplacements effectués
- Fournir des métriques sur l'utilisation des règles

### [GlossaryReplacementService](specs-creation/glossary-replacement.service.ts)
Service pour la gestion des remplacements basés sur le glossaire.

Responsabilités :
- Gérer les remplacements basés sur le glossaire
- Appliquer les règles de remplacement spécifiques au glossaire

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
