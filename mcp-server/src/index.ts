#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { ObsidianApiClient } from './http-client.js';
import { semanticSearchTool, executeSemanticSearch } from './tools/semantic-search.js';

/**
 * Serveur MCP pour la recherche sémantique Obsidian
 */
class ObsidianMcpServer {
  private server: Server;
  private apiClient: ObsidianApiClient;

  constructor() {
    this.server = new Server(
      {
        name: 'obsidian-knowledge-manager',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialiser le client API avec l'URL par défaut
    this.apiClient = new ObsidianApiClient();
    
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handler pour lister les outils disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [semanticSearchTool],
      };
    });

    // Handler pour exécuter un outil
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      if (name === 'semantic_search') {
        const query = args?.query as string;
        if (!query) {
          throw new Error('Query parameter is required');
        }

        // Vérifier que l'API est disponible
        const isHealthy = await this.apiClient.healthCheck();
        if (!isHealthy) {
          throw new Error('Obsidian API is not available. Please ensure the plugin is running and the API server is started.');
        }

        const result = await executeSemanticSearch(this.apiClient, query);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Obsidian MCP Server started'); // Utiliser stderr pour les logs
  }
}

// Démarrer le serveur
const server = new ObsidianMcpServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});