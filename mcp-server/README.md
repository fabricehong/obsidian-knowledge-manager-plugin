# Obsidian Knowledge Manager MCP Server

Ce serveur MCP expose la fonctionnalité de recherche sémantique du plugin Obsidian Knowledge Manager via le protocole Model Context Protocol (MCP).

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Utilisation

### Démarrage du serveur

```bash
npm start
```

### Intégration avec Claude Code CLI

Ajouter cette configuration à votre `claude_desktop_config.json` :

```json
{
  "mcpServers": {
    "obsidian-knowledge-manager": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

## Prérequis

1. Le plugin Obsidian Knowledge Manager doit être installé et activé
2. L'API server du plugin doit être démarré (commande `semantic:start-api-server`)
3. L'API server doit être accessible sur `http://localhost:3000`

## Outils disponibles

### `semantic_search`

Effectue une recherche sémantique dans la base de connaissances Obsidian.

**Paramètres :**
- `query` (string) : La requête de recherche

**Exemple d'utilisation :**
```
Rechercher des informations sur "NextGen TPG architecture"
```

## Configuration

Le serveur utilise par défaut l'URL `http://localhost:3000` pour communiquer avec l'API du plugin. Cette URL peut être modifiée en éditant le fichier `src/index.ts`.

## Développement

```bash
# Compilation
npm run build

# Développement avec rebuild automatique
npm run dev

# Tester le serveur MCP avec l'Inspector
npm run test
# ou
npm run inspector
```

## Test du serveur MCP

L'outil `mcp-inspector` permet de tester le serveur MCP de manière interactive :

```bash
npm run inspector
```

Cet outil vous permettra de :
- Lister les outils disponibles
- Tester l'outil `semantic_search` avec différentes requêtes
- Vérifier la communication avec l'API REST du plugin

**Important :** Assurez-vous que l'API REST du plugin Obsidian est démarrée avant de tester le serveur MCP.