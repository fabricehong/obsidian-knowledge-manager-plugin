import { MultiSemanticSearchService, MultiSearchResult } from './MultiSemanticSearchService';
import { ChunkTransformTechnique } from '../indexing/ChunkTransformTechnique';
import { SemanticSearchServiceImpl } from './SemanticSearchServiceImpl';
import { VectorStore } from '../vector-store/VectorStore';

/**
 * Service permettant d'effectuer des recherches sémantiques sur plusieurs VectorStore simultanément.
 * Orchestration de la recherche multi-technique pour différents backends vectoriels.
 */
export class MultiSemanticSearchServiceImpl implements MultiSemanticSearchService {
	/**
	 * @param vectorStores Dictionnaire des vector stores disponibles (clé = id, valeur = instance)
	 * @param chunkTransformServices Liste des services de transformation de chunk, chaque service doit avoir une propriété 'technique'
	 */
	constructor(
		private vectorStores: VectorStore[],
	) {
	}

	/**
	 * Recherche sur toutes les techniques et tous les vector stores disponibles
	 * @param query La requête utilisateur
	 * @param topK Nombre de résultats à retourner par combinaison
	 * @returns Résultats groupés par clé de vector store et technique
	 */
	public async searchEverywhere(query: string, topK: number): Promise<MultiSearchResult> {
		const results: MultiSearchResult = {};
		for (const vectorStoreInstance of this.vectorStores) {
			const vectorStoreKey = vectorStoreInstance.id;
			const collections = vectorStoreInstance.getAllCollections();
			for (const collection of collections) {
				this.logSearchContext(vectorStoreInstance, vectorStoreKey, collection);
				console.log(`[SemanticSearch] Recherche sur collection : ${collection}`);
				const service = new SemanticSearchServiceImpl(vectorStoreInstance);
				const searchResults = await service.search(query, topK, collection);
				console.log(`[SemanticSearch] Résultats pour ${vectorStoreInstance.id} (collection ${collection}) :`, searchResults.length, searchResults.map(r => ({
					pageContent: (r.chunk as any)?.pageContent,
					metadata: (r.chunk as any)?.metadata,
					score: r.score
				})));
				results[`${vectorStoreKey}_${collection}`] = searchResults;
			}
		}
		return results;
	}

	/**
	 * Affiche les informations de contexte sur le vector store ciblé
	 */
	private logSearchContext(vectorStore: VectorStore, label: string, collection: string): void {
		if (typeof vectorStore.getAllDocuments === 'function') {
			const nbDocs = vectorStore.getAllDocuments(collection).length;
			console.log(`[SemanticSearch] Recherche en cours sur vector store : ${label} [${collection}]` + (nbDocs !== undefined ? ` | Documents présents : ${nbDocs}` : ''));
		} else {
			console.log(`[SemanticSearch] Recherche en cours sur vector store : ${label} [${collection}]`);
		}
	}
}

