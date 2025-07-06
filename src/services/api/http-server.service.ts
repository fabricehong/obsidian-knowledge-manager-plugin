import * as http from 'http';
import { SemanticSearchApiService, ApiSearchRequest } from './semantic-search-api.service';

/**
 * Service HTTP pour exposer l'API de recherche sémantique
 */
export class HttpServerService {
  private server: http.Server | null = null;
  private isRunning: boolean = false;
  private readonly port: number;
  private readonly host: string;

  constructor(
    private semanticSearchApiService: SemanticSearchApiService,
    port: number = 27124,
    host: string = 'localhost'
  ) {
    this.port = port;
    this.host = host;
  }

  /**
   * Démarre le serveur HTTP
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('HTTP Server is already running');
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (error: any) => {
        console.error('[HttpServerService] Server error:', error);
        this.isRunning = false;
        reject(error);
      });

      this.server.listen(this.port, this.host, () => {
        this.isRunning = true;
        console.log(`[HttpServerService] Semantic Search API server listening on http://${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  /**
   * Arrête le serveur HTTP
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      throw new Error('HTTP Server is not running');
    }

    return new Promise((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          console.error('[HttpServerService] Error stopping server:', error);
          reject(error);
        } else {
          this.isRunning = false;
          this.server = null;
          console.log('[HttpServerService] Semantic Search API server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Vérifie si le serveur est en cours d'exécution
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Obtient l'URL du serveur
   */
  getServerUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  /**
   * Gère les requêtes HTTP
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || '', `http://${req.headers.host}`);

    try {
      if (url.pathname === '/semantic-search' && req.method === 'POST') {
        await this.handleSemanticSearch(req, res);
      } else if (url.pathname === '/health' && req.method === 'GET') {
        await this.handleHealth(req, res);
      } else {
        this.sendResponse(res, 404, { 
          error: 'Not Found', 
          message: 'Available endpoints: POST /semantic-search, GET /health' 
        });
      }
    } catch (error) {
      console.error('[HttpServerService] Error handling request:', error);
      this.sendResponse(res, 500, { 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Gère les requêtes de recherche sémantique
   */
  private async handleSemanticSearch(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await this.readRequestBody(req);
    
    let searchRequest: ApiSearchRequest;
    try {
      searchRequest = JSON.parse(body);
    } catch (error) {
      this.sendResponse(res, 400, { 
        error: 'Bad Request', 
        message: 'Invalid JSON in request body' 
      });
      return;
    }

    console.log(`[HttpServerService] Semantic search request: "${searchRequest.query}"`);

    const result = await this.semanticSearchApiService.search(searchRequest);
    
    const statusCode = result.success ? 200 : 400;
    this.sendResponse(res, statusCode, result);
  }

  /**
   * Gère les requêtes de santé
   */
  private async handleHealth(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    this.sendResponse(res, 200, {
      status: 'healthy',
      service: 'Obsidian Semantic Search API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }

  /**
   * Lit le corps de la requête
   */
  private readRequestBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', reject);
    });
  }

  /**
   * Envoie une réponse HTTP
   */
  private sendResponse(res: http.ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }
}