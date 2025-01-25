# Aide - Commandes de Remplacement de Transcript

## Vue d'ensemble
Les commandes de remplacement de transcript permettent de standardiser les noms et termes utilisés dans vos transcriptions de réunions.

## Commandes disponibles

### Création de specs de remplacement
- `transcript-replacement:replacement-specs:create:from-speakers`
  Extrait les noms des intervenants du transcript et crée une section de specs de remplacement. Ces specs peuvent ensuite être appliquées ou publiées dans le vault.

- `transcript-replacement:replacement-specs:create:from-ai`
  Alternative utilisant l'IA pour suggérer des specs de remplacement en analysant le transcript. Ces specs peuvent ensuite être appliquées ou publiées.

### Application des remplacements
- `transcript-replacement:apply:from-specs`
  Applique les remplacements au transcript en utilisant les specs locales du fichier actif ET celles publiées dans le vault. Les specs locales sont prioritaires.

- `transcript-replacement:apply:from-vocabulary`
  Applique directement les remplacements depuis le vocabulaire global, sans passer par les specs. Alternative rapide quand les specs ne sont pas nécessaires.

### Publication des specs
- `transcript-replacement:replacement-specs:publish-to-vault`
  Déplace les specs du fichier actif vers le vault pour une utilisation globale. Ces specs seront utilisées par 'apply:from-specs' pour tous les fichiers.

## Workflow typique
1. Créer des specs de remplacement :
   - Soit via `create:from-speakers` pour extraire les noms des intervenants
   - Soit via `create:from-ai` pour des suggestions basées sur l'IA
2. Vérifier et ajuster les specs générées si nécessaire
3. Appliquer les specs avec `apply:from-specs` pour tester localement
4. Si les remplacements sont satisfaisants, utiliser `publish-to-vault` pour les rendre disponibles globalement
5. Pour les cas simples, utiliser directement `apply:from-vocabulary`
