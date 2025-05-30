import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '@langchain/core/vectorstores';
import { Orama, Results, TypedDocument, create, insertMultiple, removeMultiple, search } from '@orama/orama';

// Optionally, adapt or remove this import if you want to handle logging differently
// import Log from './Logging';

const vectorStoreSchema = {
    id: 'string',
    filepath: 'string',
    order: 'number',
    header: 'string[]',
    content: 'string',
    collection: 'string', // <-- Ajouté pour prise en charge de la collection
} as const;

type VectorDocument = TypedDocument<Orama<typeof vectorStoreSchema>>;

export interface VectorStoreBackup {
    indexName: string;
    vectorSize: number;
    docs: VectorDocument[];
}

export class OramaVectorStore extends VectorStore {
  /**
   * Réinitialise complètement le vector store (supprime tous les documents).
   */
  public async reset(): Promise<void> {
    if (this.db) {
      // Réinstancie la base pour la vider complètement
      await this.create(this.indexName, this.vectorSize);
    }
  }
    private db: Orama<typeof vectorStoreSchema>;
    private indexName: string;
    private vectorSize: number;
    private similarity: number;

    _vectorstoreType(): string {
        return 'OramaVectorStore';
    }

    constructor(
        public embeddings: Embeddings,
        args: Record<string, any>
    ) {
        super(embeddings, args);
        this.similarity = args.similarityThreshold;
    }

    async create(indexName: string, vectorSize?: number) {
        console.log('[OramaVectorStore.create] called for', indexName);
        this.vectorSize = vectorSize ?? (await this.embeddings.embedQuery('test')).length;
        this.indexName = indexName;
        this.db = await create({
            schema: {
                ...vectorStoreSchema,
                embedding: `vector[${this.vectorSize}]`,
            } as const,
            id: indexName,
        });
        console.log('[OramaVectorStore.create] db initialized:', !!this.db);
    }

    async restore(vectorStoreBackup: VectorStoreBackup) {
        console.log('[OramaVectorStore.restore] called for', vectorStoreBackup.indexName);
        const docs = Array.isArray(vectorStoreBackup.docs)
  ? vectorStoreBackup.docs
  : Object.values(vectorStoreBackup.docs) as VectorDocument[];
        await this.create(vectorStoreBackup.indexName, vectorStoreBackup.vectorSize);
        console.log('[OramaVectorStore.restore] after create, db:', !!this.db);
        await insertMultiple(this.db, docs);
        console.log('[OramaVectorStore.restore] restored docs count:', docs.length);
    }

    async delete(filters: { ids: string[] }) {
        await removeMultiple(this.db, filters.ids);
    }

    // Ajoute une liste de vecteurs et leurs documents associés dans la base
    async addVectors(vectors: number[][], documents: Document[]) {
        if (!this.db) throw new Error('OramaVectorStore.db is not initialized!');
        const docs: VectorDocument[] = documents.map((doc, i) => this.toVectorDocument(doc, vectors[i], i));
        return await insertMultiple(this.db, docs);
    }

    // Ajoute des documents en générant d'abord leurs embeddings
    async addDocuments(documents: Document[]) {
        const vectors = await this.embeddings.embedDocuments(documents.map(doc => doc.pageContent));
        await this.addVectors(vectors, documents);
    }

    // Conversion factorisée pour plus de clarté
    private toVectorDocument(document: Document, vector: number[], index: number): VectorDocument {
        const meta = (document && typeof document === 'object' && 'metadata' in document && typeof (document as any).metadata === 'object')
            ? (document as any).metadata as Record<string, any>
            : document as Record<string, any>;
        return {
            id: meta.hash ?? meta.id,
            filepath: meta.filepath,
            content: meta.content ?? (document as any).pageContent ?? meta.pageContent,
            header: meta.header,
            order: meta.order ?? index,
            collection: meta.collection,
            embedding: vector,
        };
    }

    /**
     * Recherche vectorielle avec score, supporte UNIQUEMENT le filtrage simple (doc => doc.champ === valeur).
     * Si le filtre est absent ou complexe, une exception est levée.
     */
    /**
     * Recherche vectorielle avec score, supporte UNIQUEMENT le filtrage simple sous forme d'objet (ex: { collection: 'foo' }).
     * Si le filtre est absent ou n'est pas un objet simple, une exception est levée.
     */
    async similaritySearchVectorWithScore(
        query: number[],
        k: number,
        filter?: Record<string, any>
    ): Promise<[Document, number][]> {
        // 1. Vérifie que le filtre est un objet simple (clé/valeur)
        if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
            throw new Error('[OramaVectorStore] Le filtre doit être un objet simple (ex: { collection: "foo" }).');
        }
        // 2. Exécute la recherche vectorielle Orama avec filtrage natif
        const results: Results<VectorDocument> = await search(this.db, {
            mode: 'vector',
            vector: { value: query, property: 'embedding' },
            limit: k,
            similarity: this.similarity,
            where: filter,
        });
        // DEBUG : log le premier résultat brut
        if (results.hits.length > 0) {
            console.log('[OramaVectorStore] Premier hit brut:', results.hits[0]);
        }
        // Retourne les résultats sous forme [Document, number]
        return results.hits.slice(0, k).map(result => [
            new Document({
                metadata: {
                    filepath: result.document.filepath,
                    order: result.document.order,
                    header: result.document.header,
                    collection: result.document.collection,
                },
                pageContent: result.document.content,
            }),
            result.score,
        ]);
    }

    async getData(): Promise<VectorStoreBackup> {
        return { indexName: this.indexName, vectorSize: this.vectorSize, docs: this.db.data.docs.docs as VectorDocument[] };
    }

    setSimilarityThreshold(similarityThreshold: number) {
        this.similarity = similarityThreshold;
    }
}
