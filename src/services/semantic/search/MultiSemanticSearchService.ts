import { VectorStore } from '../vector-store/VectorStore';
import { SearchResult, SemanticSearchService } from './SemanticSearchService';

// Interface exportée représentant un résultat de recherche multi-cible
export interface MultiSearchResult {
	[targetKey: string]: SearchResult[];
}

/**
 * Service permettant d'effectuer des recherches sémantiques sur plusieurs VectorStore simultanément.
 * Orchestration de la recherche multi-technique pour différents backends vectoriels.
 */
export class MultiSemanticSearchService {
	/**
	 * @param semanticSearchServices Liste des services de recherche sémantique (chacun encapsule son vectorStore)
	 */
	constructor(
		private semanticSearchServices: SemanticSearchService[],
	) {}


	/**
	 * Recherche sur toutes les techniques et tous les vector stores disponibles
	 * @param query La requête utilisateur
	 * @param topK Nombre de résultats à retourner par combinaison
	 * @returns Résultats groupés par clé de vector store et technique
	 */
	public async searchEverywhere(query: string, topK: number): Promise<MultiSearchResult> {
		const results: MultiSearchResult = {};
		for (const semanticService of this.semanticSearchServices) {
			const vectorStoreInstance = semanticService.vectorStore;
			const vectorStoreKey = vectorStoreInstance.id;
			const collections = vectorStoreInstance.getAllCollections();
			for (const collection of collections) {
				semanticService.logSearchContext(collection);
				console.log(`[SemanticSearch] Recherche sur collection : ${collection}`);
				const searchResults = await semanticService.search(query, topK, collection);
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
}

