# Spécification fonctionnelle — Système d’évaluation et de recherche sémantique sur les chunks

## 1. Contexte et objectifs

L’objectif est de permettre l’évaluation et la comparaison de différentes stratégies d’indexation sémantique sur les chunks issus de la Vault Obsidian, ainsi que la recherche sémantique sur ces chunks indexés.
Le système doit permettre de :

* Combiner librement :

  * la technique de transformation de chunk en texte indexable,
  * le backend de vectorisation (vector store).
* Indexer des batchs de chunks selon chaque combinaison.
* Rechercher et comparer les résultats selon chaque combinaison technique/vector store.

---

## 2. Modèle de données

* Le modèle de chunk utilisé est le modèle :

  ```ts
  Chunk
  ```

  existant du projet (déclaré dans :

  ```ts
  src/models/chunk.ts
  ```

  ).

* Toute extension de données (ex : texte indexé, score) est encapsulée dans des objets dédiés (`IndexableChunk`, `SearchResult`), sans modification de l’interface originale du chunk.

---

## 3. Organisation des composants

L’ensemble des composants est regroupé sous le dossier :

```ts
src/services/semantic/
```

Organisé ainsi :

* `vector-store/` : Abstractions et types pour les backends vectoriels (utilisés pour l’indexation et la recherche).
* `indexing/` : Tout ce qui concerne la transformation, l’indexation batch, l’orchestration multi-techniques.
* `search/` : Tous les services de recherche sémantique (mono ou multi-combinaisons).

Principaux fichiers/interfaces :
- `indexing/ChunkTransformTechnique.ts` (enum des techniques)
- `indexing/ChunkTransformService.ts` (interface service de transformation)
- `vector-store/VectorStoreType.ts` (enum des stores)
- `vector-store/VectorStore.ts` (interface store)
- `indexing/BatchChunkTransformer.ts` (interface batch)
- `indexing/BatchChunkTransformerImpl.ts` (implémentation batch)
- `indexing/MultiTechniqueChunkTransformer.ts` (interface multi-technique)
- `indexing/MultiTechniqueChunkTransformerImpl.ts` (implémentation multi-technique)
- `search/SemanticSearchService.ts` (interface recherche)
- `search/MultiSemanticSearchService.ts` (multi-recherche)
- `indexing/IndexableChunk.ts` (modèle chunk transformé)
- `src/models/chunk.ts` (modèle chunk de base)

> **Sélection et instanciation concrètes**
>
> - **Types disponibles** : Les types de vector stores (`VectorStoreType`) et de techniques d’indexation (`ChunkTransformTechnique`) sont listés dans leurs enums respectifs.
> - **Instances réellement utilisées** : La sélection et la création concrète des instances (vector stores et techniques) se font dans :
>   - `src/services/service-container.ts` (classe `ServiceContainer`)
>   - Propriétés : `vectorStores` (liste des vector stores actifs) et `chunkTransformServices` (liste des techniques actives)
>   - C’est ici que l’on ajoute ou retire dynamiquement les implémentations réellement disponibles pour le plugin.

---

## 4. Interfaces et responsabilités

### 4.1. Transformation de chunk

* **Enum** :

  ```ts
  ChunkTransformTechnique
  ```

  Liste toutes les techniques de transformation de chunk en texte indexable, identifiées de façon unique et stable.

* **Service** :

  ```ts
  ChunkTransformService
  ```

  Fournit une interface pour transformer un chunk en texte indexable.
  Chaque technique est une implémentation distincte et sélectionnable dynamiquement.

### 4.2. Vector Store

* **Enum** :

  ```ts
  VectorStoreType
  ```

  Enumère les types de vector stores supportés (Pinecone, Qdrant, FAISS, etc.).

* **Interface** :

  ```ts
  VectorStore
  ```

  Permet d’indexer des objets :

  ```ts
  {chunk, text}
  ```

  (`IndexableChunk`) dans un backend vectoriel, par batch.
  Supporte la notion de collection/namespace, dérivée explicitement de la technique utilisée.

### 4.3. Transformation batch (pré-indexation)

* **Service** :

  ```ts
  BatchChunkTransformer
  ```

  Orchestration de la transformation d’un batch de chunks via une technique donnée, produisant des `IndexableChunk[]` prêts à être indexés dans un vector store. Ce service ne fait que la transformation, pas l’indexation. Travaille uniquement via les interfaces abstraites, sans connaître les implémentations concrètes.

### 4.4. Transformation multi-techniques (pré-indexation)

* **Service** :

  ```ts
  MultiTechniqueChunkTransformer
  ```

  Orchestration de la transformation multi-techniques : applique toutes les techniques de transformation à un batch de chunks, retourne un mapping technique → IndexableChunk[].

  Ce service ne fait que la transformation, pas l’indexation. Chaque technique utilise une collection dédiée, nommée explicitement selon la technique employée.

### 4.5. Recherche sémantique

* **Service** :

  ```ts
  SemanticSearchService
  ```

  Permet d’effectuer une recherche sémantique dans un vector store donné, pour une technique d’indexation donnée (via la collection correspondante).
  Prend en entrée :

  * une requête textuelle,
  * un nombre de résultats,
  * le nom de la collection/namespace.

  Retourne une liste de résultats :

  ```ts
  {chunk, score}
  ```

  (`SearchResult`)

### 4.6. Recherche multi-combinaisons

* **Service** :

  ```ts
  MultiSemanticSearchService
  ```

  Orchestration de recherches parallèles sur plusieurs combinaisons (technique/vector store).
  Retourne un mapping associant chaque couple à sa liste de résultats.

---

## 5. Lien fort entre technique et collection

* Le nom de la collection (ou namespace) dans chaque vector store est strictement dérivé de la technique de transformation utilisée.
* Ce lien est explicite dans le code, via enum, mapping ou méthode dédiée.

---

## 6. Extension et évolutivité

* L’architecture permet d’ajouter facilement :

  * de nouvelles techniques de transformation,
  * de nouveaux vector stores,
  * de nouveaux modes d’indexation ou de recherche.
* Les interfaces sont documentées et découplées des implémentations concrètes.

---

## 7. Synthèse des flux

### Indexation

1. Les chunks sont extraits selon la configuration utilisateur (via `editorChunkingService`).
2. Pour chaque technique de transformation (`ChunkTransformTechnique`), tous les chunks sont transformés en `IndexableChunk[]` via `multiTechniqueChunkTransformer.transformAllTechniquesToIndexableChunks`.
3. Pour chaque combinaison (technique, vector store), les `IndexableChunk[]` sont indexés dans la collection correspondante via `batchIndexableChunkIndexer.indexTransformedChunks`.

Chaque étape est orchestrée par des services dédiés :
- `MultiTechniqueChunkTransformer` pour la transformation multi-techniques
- `BatchIndexableChunkIndexer` pour l’indexation batch dans chaque vector store

Le nom de la collection/namespace est toujours dérivé de la technique utilisée.

**NB : Cette architecture permet d’ajouter dynamiquement des techniques ou des vector stores, et garantit que chaque couple (technique, vector store) a sa propre collection.**

### Recherche

1. L’utilisateur saisit une requête textuelle et choisit le nombre de résultats souhaités.
2. Pour chaque combinaison (technique d’indexation, vector store) :

   * Le service de recherche embedd la requête, interroge la bonne collection, retourne les résultats.
3. Le service multi-recherche orchestre tous les appels et retourne un objet structuré permettant la comparaison des résultats.

---

## 8. Points inchangés et conformité

* Tous les détails originaux sont respectés :

  * découplage des interfaces,

  * extensibilité,

  * traçabilité via le nom de collection,

  * non-modification du modèle :

    ```ts
    Chunk
    ```

  * possibilité de comparer toutes les combinaisons.

* La seule adaptation concerne l’organisation des dossiers, désormais :

  * `vector-store/` (transverse)
  * `indexing/` (batch, multi-technique…)
  * `search/` (tous types de recherche)
