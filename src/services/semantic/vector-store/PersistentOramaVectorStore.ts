import { VectorStore, IndexableChunk } from './VectorStore';
import { OramaVectorStore, VectorStoreBackup } from './OramaVectorStore';
import { Embeddings } from '@langchain/core/embeddings';
import { promises as fs } from 'fs';
import { Document } from '@langchain/core/documents';
import { dirname } from 'path';

const SIMILARITY_THRESHOLD = 0.4;

// Classe persistante basée sur OramaVectorStore
export class PersistentOramaVectorStore implements VectorStore {
	/**
	 * Réinitialise complètement le vector store (supprime tous les documents).
	 */
	public async reset(): Promise<void> {
		this.store = new OramaVectorStore(this.embeddingsProvider, { similarityThreshold: SIMILARITY_THRESHOLD });
		await this.store.create('default');
		this.lastRestoredDocumentCount = 0;
		this.initialized = true;
		await this.save();
	}

	public readonly id: string;
	/**
	 * Nombre de documents présents dans la base après le dernier restore/init.
	 */
	public lastRestoredDocumentCount: number = 0;
	private store: OramaVectorStore | undefined;
	private embeddingsProvider: Embeddings;
	private persistencePath: string;
	private initialized: boolean = false;

	constructor(embeddingsProvider: Embeddings, persistencePath: string) {
		this.embeddingsProvider = embeddingsProvider;
		this.persistencePath = persistencePath;
    this.id = this.getModelName() || 'unknown-model';
		console.log('[PersistentOramaVectorStore.constructor] called', persistencePath);
	}

	/**
	 * Initialise le vector store (restaure depuis le disque si backup, sinon laisse vide)
	 */
	public async init(): Promise<void> {
		if (this.initialized) {
			console.log('[PersistentOramaVectorStore.init] already initialized');
			return;
		}
		this.store = new OramaVectorStore(this.embeddingsProvider, { similarityThreshold: SIMILARITY_THRESHOLD });
		try {
			console.log('[PersistentOramaVectorStore.init] checking persistencePath');
			await fs.access(this.persistencePath);
			const content = await fs.readFile(this.persistencePath, 'utf-8');
			const backup = JSON.parse(content);
			console.log('[PersistentOramaVectorStore.init] restoring from backup');
			await this.store.restore(backup);
			console.log('[PersistentOramaVectorStore] db.data.docs:', (this.store as any).db?.data?.docs);
			console.log('[PersistentOramaVectorStore] db.data.docs.docs:', (this.store as any).db?.data?.docs?.docs);
			const docsRaw = (this.store as any).db?.data?.docs?.docs;
			console.log('[PersistentOramaVectorStore] docsRaw keys:', docsRaw ? Object.keys(docsRaw) : docsRaw);
			if (docsRaw && typeof docsRaw === 'object') {
				const firstKey = Object.keys(docsRaw)[0];
				console.log('[PersistentOramaVectorStore] Premier doc restauré:', docsRaw[firstKey]);
			}
			const docs: any[] = Array.isArray(docsRaw)
				? docsRaw
				: (docsRaw && typeof docsRaw === 'object')
					? Object.values(docsRaw)
					: [];
			this.lastRestoredDocumentCount = docs.length;
			console.log(`[PersistentOramaVectorStore] Documents restaurés (comptés): ${this.lastRestoredDocumentCount}`);
		} catch (e) {
			console.log('[PersistentOramaVectorStore.init] no backup, creating new store');
			await this.store.create('default');
			this.lastRestoredDocumentCount = 0;
		}
		this.initialized = true;
		console.log('[PersistentOramaVectorStore.init] done, initialized =', this.initialized);
	}

	public async save() {
		this.ensureInitialized();
		const backup = await this.store!.getData();
		// Ensure the directory exists before writing
		const dir = dirname(this.persistencePath);
		await fs.mkdir(dir, { recursive: true });
		await fs.writeFile(this.persistencePath, JSON.stringify(backup), 'utf-8');
	}

	public async indexBatch(chunks: IndexableChunk[], collection: string) {
		this.ensureInitialized();
		if (!chunks.length) return;
		const docs = chunks.map((chunk, i) => this.chunkToDocument(chunk, collection, i));
		await this.store!.addDocuments(docs);
		await this.save();
	}

	private chunkToDocument(chunk: IndexableChunk, collection: string, index: number): Document {
		const hierarchy = chunk.chunk.hierarchy;
		const dirs = hierarchy.filter(h => h.type === 'directory').map(h => h.name);
		const file = hierarchy.find(h => h.type === 'file')?.name;
		const headers = hierarchy.filter(h => h.type === 'header').map(h => h.name);
		let path = '';
		if (dirs.length) path += dirs.join('/') + '/';
		if (file) path += file + '.md';
		if (headers.length) path += '#' + headers.join('#');
		const fileOnly = file ? (dirs.length ? dirs.join('/') + '/' : '') + file + '.md' : '';
		return {
			pageContent: chunk.pageContent,
			id: path,
			metadata: {
				...chunk.chunk,
				collection,
				filepath: fileOnly,
				header: headers,
				order: (chunk.chunk as any).order ?? index,
			},
		};
	}

	async search(query: string, topK: number, collection: string): Promise<any[]> {
		this.ensureInitialized();
		console.log('[PersistentOramaVectorStore.search] collection:', collection);
		// Passe un objet de filtre simple
		const filter = { collection };
		console.log('[PersistentOramaVectorStore.search] filter type:', typeof filter, 'value:', filter);
		const results = await this.store!.similaritySearchWithScore(query, topK, filter);
		const mapped = results.map(([doc, score]) => ({ chunk: doc, score }));
		if (mapped.length > 0) {
			console.log('[PersistentOramaVectorStore.search] Premier chunk retourné:', mapped[0]);
		}
		return mapped;
	}

	/**
	 * Retourne tous les documents du vector store, ou uniquement ceux d'une collection si précisé.
	 */
	public getAllDocuments(collection: string): any[] {
		this.ensureInitialized();
		// OramaVectorStore stocke tous les documents dans db.data.docs.docs
		const docsRaw = (this.store as any).db?.data?.docs?.docs;
		const docs: any[] = Array.isArray(docsRaw)
			? docsRaw
			: (docsRaw && typeof docsRaw === 'object')
				? Object.values(docsRaw)
				: [];
		return docs.filter(doc => doc.collection === collection);
	}

	/**
	 * Retourne la liste unique des collections présentes dans les documents du store.
	 */
	public getAllCollections(): string[] {
		this.ensureInitialized();
		const docsRaw = (this.store as any).db?.data?.docs?.docs;
		const docs: any[] = Array.isArray(docsRaw)
			? docsRaw
			: (docsRaw && typeof docsRaw === 'object')
				? Object.values(docsRaw)
				: [];
		const collections = docs
			.map(doc => doc.collection)
			.filter((c, i, arr) => c && arr.indexOf(c) === i);
		return collections;
	}

	public getModelName(): string | undefined {
		// Pas besoin de store pour cette méthode
		if ('model' in this.embeddingsProvider) {
			// @ts-ignore
			return this.embeddingsProvider.model;
		}
		return this.embeddingsProvider?.constructor?.name;
	}

	/**
	 * Vérifie que le store est bien initialisé, sinon lève une erreur explicite
	 */
	private ensureInitialized() {
		if (!this.initialized || !this.store) {
			throw new Error('[PersistentOramaVectorStore] Store not initialized. Call init() before any operation.');
		}
	}
}
