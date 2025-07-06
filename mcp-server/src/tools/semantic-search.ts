import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ObsidianApiClient } from '../http-client.js';

/**
 * Définit l'outil MCP pour la recherche sémantique
 */
export const semanticSearchTool: Tool = {
  name: 'semantic_search',
  description: 'Search through Obsidian knowledge base using semantic search. Returns relevant document chunks with content, file paths, and relevance scores.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to find relevant content in the knowledge base',
      },
    },
    required: ['query'],
  },
};

/**
 * Exécute la recherche sémantique via l'API Obsidian
 */
export async function executeSemanticSearch(
  apiClient: ObsidianApiClient,
  query: string
): Promise<string> {
  try {
    const response = await apiClient.semanticSearch(query);
    
    if (!response.success) {
      return `Error: ${response.error || 'Unknown error occurred'}`;
    }

    if (response.results.length === 0) {
      return `No results found for query: "${query}"`;
    }

    // Formater les résultats pour l'affichage
    const formattedResults = response.results.map((result, index) => {
      return `## Result ${index + 1} (Score: ${result.score.toFixed(3)})
**File:** ${result.file_path}

${result.content}

---`;
    }).join('\n');

    return `Found ${response.count} results for query: "${query}"

${formattedResults}`;

  } catch (error) {
    return `Error executing semantic search: ${error instanceof Error ? error.message : String(error)}`;
  }
}