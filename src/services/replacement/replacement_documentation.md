# Documentation du Répertoire Replacement

## Vue d'ensemble
Le répertoire `replacement` est responsable de la gestion des remplacements de texte dans l'éditeur Obsidian. Il fournit des services pour manipuler et transformer le texte selon différentes règles, notamment pour la transcription et la gestion des métadonnées YAML.

### Objectif général
- Fournir une infrastructure robuste pour le remplacement de texte dans l'éditeur
- Gérer les règles de transcription et leur application
- Maintenir des statistiques sur les remplacements effectués
- Gérer les spécifications de remplacement provenant de différentes sources

## Services et leurs responsabilités

### Services de stockage

#### [EditorReplacementSpecsStorageService](editor-replacement-specs-storage.service.ts)
Service principal pour la gestion du stockage des spécifications de remplacement.

Responsabilités :
- Lire les spécifications depuis les fichiers tagués
- Lire les spécifications depuis le fichier actif
- Gérer les différents formats de stockage (section dédiée vs frontmatter)
- Valider les spécifications via le YamlService

#### [EditorVocabularySpecsStorageService](editor-vocabulary-specs-storage.service.ts)
Service pour la gestion du stockage des spécifications de vocabulaire.

Responsabilités :
- Lire les spécifications de vocabulaire depuis les fichiers tagués
- Valider les spécifications via le YamlService

### Services d'application

#### [EditorTranscriptionReplacementService](apply-replacement/editor-transcription-replacement.service.ts)
Service principal pour l'interaction avec l'éditeur Obsidian.

Dépendances :
- `App` : Pour l'interaction avec l'API Obsidian
- `TranscriptionReplacementService` : Pour les règles de remplacement
- `DocumentStructureService` : Pour l'analyse de structure
- `YamlService` : Pour la gestion des spécifications

Responsabilités :
- Gérer les interactions avec l'éditeur Obsidian
- Appliquer les remplacements de texte
- Coordonner les différents services de remplacement

#### [TranscriptionReplacementService](apply-replacement/transcription-replacement.service.ts)
Service central pour la logique de remplacement.

Responsabilités :
- Implémenter la logique de base des remplacements
- Gérer les règles de transcription
- Fournir des méthodes de transformation de texte

### Services de diffusion

#### [ReplacementSpecsIntegrationService](replacement-diffusion/replacement-specs-integration.service.ts)
Service pour l'intégration et la diffusion des spécifications de remplacement.

Responsabilités :
- Gérer l'intégration des spécifications entre différentes sources
- Évaluer la compatibilité des spécifications
- Coordonner la diffusion des mises à jour

## Traitement des spécifications de remplacement

### Sources des spécifications
1. Fichier actif :
   - Les specs sont recherchées dans une section spécifique (configurable via `replacementsHeader`)
   - Doivent contenir un bloc YAML valide
   - Une confirmation utilisateur est demandée si la section n'est pas trouvée

2. Fichiers tagués (#replacement-specs) :
   - Les specs sont directement dans le frontmatter YAML
   - Le fichier entier est lu et traité par le YamlService
   - Pas de recherche de section spécifique

## Flux typiques

### Flux de remplacement standard
1. Déclencheur : Commande de remplacement dans l'éditeur
2. Collecte des spécifications :
   - `EditorReplacementSpecsStorageService` récupère les specs des différentes sources
   - Les specs sont validées et fusionnées si nécessaire
3. Application des remplacements :
   - `EditorTranscriptionReplacementService` coordonne l'opération
   - `TranscriptionReplacementService` applique les transformations
4. Résultat : Texte modifié dans l'éditeur

### Flux de diffusion des spécifications
1. Modification des specs dans un fichier source
2. `ReplacementSpecsIntegrationService` :
   - Évalue la compatibilité des changements
   - Coordonne la diffusion aux fichiers cibles
3. Mise à jour des fichiers cibles avec les nouvelles specs
