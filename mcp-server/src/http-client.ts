import axios, { AxiosInstance } from 'axios';

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
 * Client HTTP pour communiquer avec l'API REST du plugin Obsidian
 */
export class ObsidianApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:27124') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Effectue une recherche sémantique via l'API REST du plugin
   */
  async semanticSearch(query: string): Promise<ApiSearchResponse> {
    try {
      const response = await this.client.post<ApiSearchResponse>('/semantic-search', {
        query,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`API request failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      }
      throw new Error(`Unexpected error: ${error}`);
    }
  }

  /**
   * Vérifie si l'API est disponible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Change l'URL de base pour l'API
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
    this.client.defaults.baseURL = baseUrl;
  }
}