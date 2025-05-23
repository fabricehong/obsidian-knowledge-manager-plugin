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
src/semantic/
```

Organisé ainsi :

* `vector-store/` : Abstractions et types pour les backends vectoriels (utilisés pour l’indexation et la recherche).
* `indexing/` : Tout ce qui concerne la transformation, l’indexation batch, l’orchestration multi-techniques.
* `search/` : Tous les services de recherche sémantique (mono ou multi-combinaisons).

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

### 4.3. Indexation batch

* **Service** :

  ```ts
  BatchIndexer
  ```

  Orchestration de la transformation d’un batch de chunks via une technique donnée, puis indexation dans un vector store cible.
  Travaille uniquement via les interfaces abstraites, sans connaître les implémentations concrètes.

### 4.4. Indexation multi-techniques

* **Service** :

  ```ts
  MultiTechniqueIndexer
  ```

  Permet d’indexer en parallèle toutes les combinaisons :

  * techniques de transformation,
  * vector stores disponibles.

  Chaque indexation utilise une collection dédiée, nommée explicitement selon la technique employée.

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

1. L’utilisateur sélectionne un lot de chunks :

   ```ts
   Chunk[]
   ```

2. Pour chaque technique de transformation :

   * Les chunks sont transformés en texte indexable.
   * Pour chaque vector store :

     * Les textes sont indexés en batch dans une collection dédiée à la technique.

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
