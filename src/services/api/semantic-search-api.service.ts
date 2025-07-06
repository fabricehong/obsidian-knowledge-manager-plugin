import { ChatSemanticSearchService } from '../semantic/search/ChatSemanticSearchService';
import { SearchResult } from '../semantic/search/SemanticSearchService';
import { ChunkHierarchyLevel, ChunkHierarchyType } from '../../models/chunk';

export interface ApiSearchRequest {
  query: string;
}

export interface ApiSearchResult {
  content: string;
  file_path: string;
  score: number;
}

export interface ApiSearchResponse {
  success: boolean;
  results: ApiSearchResult[];
  query: string;
  count: number;
  message?: string;
  error?: string;
}

/**
 * Service pour exposer la recherche sémantique via API REST
 * Service pur sans dépendances Obsidian pour faciliter les tests
 */
export class SemanticSearchApiService {
  constructor(private chatSemanticSearchService: ChatSemanticSearchService) {}

  /**
   * Effectue une recherche sémantique et retourne les résultats formatés pour l'API
   * @param request Requête de recherche
   * @returns Réponse API formatée
   */
  async search(request: ApiSearchRequest): Promise<ApiSearchResponse> {
    try {
      // Validation des paramètres
      if (!request.query || request.query.trim().length === 0) {
        return {
          success: false,
          results: [],
          query: request.query || '',
          count: 0,
          error: 'Query cannot be empty'
        };
      }

      // Paramètres hardcodés dans le plugin
      const topK = 10; // Nombre de résultats à retourner

      // Effectuer la recherche
      const results: SearchResult[] = await this.chatSemanticSearchService.search(request.query, topK);

      // Formater les résultats
      const formattedResults = results.map(result => this.formatResultForApi(result));

      return {
        success: true,
        results: formattedResults,
        query: request.query,
        count: formattedResults.length,
        message: `Found ${formattedResults.length} semantic search results`
      };

    } catch (error) {
      console.error('[SemanticSearchApiService] Error during search:', error);

      return {
        success: false,
        results: [],
        query: request.query || '',
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Formate un résultat de recherche pour l'API
   */
  private formatResultForApi(result: SearchResult): ApiSearchResult {
    console.log(result);
    // Extraire le chemin du fichier
    let filePath = result.chunk.metadata?.filepath;
    let content = result.chunk.pageContent || '';

    return {
      content: content,
      file_path: filePath || '',
      score: result.score,
    };
  }
}
