# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Development
- `npm run dev` - Start development mode with esbuild watch
- `npm run build` - Production build with TypeScript checking
- `npm run test` - Run Jest tests

### Setup
- `nvm use` - Switch to the correct Node.js version before running any npm commands
- `npm run setup` - Initialize submodules and install dependencies
- `npm run setup:dev` - Full development setup including submodule dependencies

## Architecture Overview

This is an Obsidian plugin for knowledge management using AI-powered features. The codebase follows a service-oriented architecture with dependency injection through a central ServiceContainer.

### Core Architecture Components

**ServiceContainer** (`src/services/service-container.ts`): Central dependency injection container that manages all services and their dependencies. Each instance has a unique ID for debugging.

**Plugin Main** (`src/main.ts`): Main plugin class that registers commands, views, and initializes the ServiceContainer. Commands are organized by functionality (semantic, transcript-replacement, etc.).

**LLM Integration**: Uses LangChain with support for multiple providers (OpenAI, Ollama) configured through settings. Model selection is handled by ModelFactory from the obsidian-utils submodule.

### Key Service Categories

1. **Semantic Services** (`src/services/semantic/`): Vector search, chunking, embeddings, and indexing
2. **Chat Services** (`src/services/chat/`): AI chat with agent-based architecture 
3. **Transcription** (`src/services/transcription/`): Audio transcription and speaker identification
4. **Document Processing** (`src/services/document/`, `src/services/diffusion/`): Content fusion, knowledge diffusion, document cleaning
5. **Replacement/Vocabulary** (`src/services/replacement/`, `src/services/vocabulary/`): Text correction and terminology standardization

### Vector Storage Architecture

Uses multiple vector stores (OramaVectorStore) with different embedding models:
- Stores persist to `./vector-database/` directory
- Supports multiple chunking techniques (ContextualizedChunkTransformService)
- Multi-technique transformer for enhanced search accuracy

### Submodule Dependencies

**obsidian-utils** (`src/libs/obsidian-utils/`): Shared library containing LLM services, UI components, and utilities. Managed as git submodule.

### Settings Architecture

Settings are typed (`src/settings/settings.ts`) with support for:
- Multiple LLM configurations and organizations
- Chunking folder configurations  
- Various AI service API keys
- Header and tag configurations for document processing

### Testing

Jest configured for TypeScript with:
- Test files: `src/**/*.spec.ts`
- Module name mapping for ES modules
- Transform configuration for double-metaphone and fastest-levenshtein packages

### Command Structure

Commands follow naming convention: `{category}:{action}` (e.g., `semantic:chat`, `transcript-replacement:apply:from-specs`)

### Key File Patterns

- Editor services: Wrap core services for Obsidian editor integration
- YAML services: Handle structured data in frontmatter/document sections
- Modal classes: UI dialogs for user interaction
- Spec files: Test files using Jest

## Code Conventions

### Command Implementation Pattern

Commands in `main.ts` should contain minimal code. Follow this hierarchy:

1. **Simple commands**: Direct service calls in command callback
2. **Complex commands**: Create private methods in main.ts for setup logic
3. **Business logic**: Always create dedicated services in appropriate `src/services/` subdirectories

### Service Architecture Pattern

The codebase follows a **layered service architecture** that separates Obsidian dependencies from pure business logic for better testability:

#### Editor Services (Obsidian-dependent)
- **Naming**: Prefixed with `editor-` (e.g., `editor-transcription-replacement.service.ts`)
- **Purpose**: Handle Obsidian API interactions, file operations, UI feedback
- **Dependencies**: Can import Obsidian types (`App`, `MarkdownView`, `Notice`, etc.)
- **Testing**: Difficult to unit test due to Obsidian dependencies

#### Pure Business Logic Services
- **Naming**: No prefix (e.g., `transcription-replacement.service.ts`)
- **Purpose**: Core algorithms and business rules
- **Dependencies**: No Obsidian imports, only domain models and utilities
- **Testing**: Easily unit testable with no mocking required

#### Example Pattern:

```typescript
// Pure business logic
export class TranscriptionReplacementService {
    applyReplacements(content: string, specs: ReplacementSpecs[]): ReplacementResult {
        // Pure logic - no Obsidian dependencies
    }
}

// Editor service wrapper
export class EditorTranscriptionReplacementService {
    constructor(
        private app: App,
        private transcriptionReplacementService: TranscriptionReplacementService
    ) {}
    
    async replaceTranscription(markdownView: MarkdownView): Promise<void> {
        // Handle Obsidian file operations
        const content = editor.getValue();
        
        // Call pure business logic
        const result = this.transcriptionReplacementService.applyReplacements(content, specs);
        
        // Handle UI feedback and file modifications
        editor.setValue(result.content);
        new Notice('Replacement completed!');
    }
}
```

### Service Organization

- Place related services in same subdirectory (e.g., `services/transcription/`)
- Editor services depend on and call pure services
- Pure services contain the testable business logic
- ServiceContainer manages dependency injection for both types

### Testing Conventions

- **Test files**: Use `.spec.ts` extension (e.g., `transcription-replacement.service.spec.ts`)
- **Location**: Place test files in the same directory as their implementation
- **Focus**: Primarily test pure business logic services (non-editor services)
- **Structure**: Tests follow Jest patterns with describe/it blocks

## MCP (Model Context Protocol) Integration

The plugin includes a **separate MCP server** (`mcp-server/`) that exposes semantic search functionality via the Model Context Protocol. This allows external tools like Claude Code CLI to access the plugin's semantic search capabilities.

### MCP Architecture

**Two-tier architecture**:
1. **Plugin REST API** (`src/services/api/`): HTTP server running within the Obsidian plugin
2. **MCP Server** (`mcp-server/`): Standalone Node.js application that communicates with the plugin's REST API

### MCP Server Commands

In the `mcp-server/` directory:
- `npm run build` - Build the MCP server
- `npm run start` - Start the MCP server (after building)
- `npm run dev` - Build and start in one command
- `npm run inspect` - Debug the MCP server with the MCP inspector tool

### Plugin API Server Commands

Within Obsidian:
- `semantic:start-api-server` - Start the HTTP API server in the plugin
- `semantic:stop-api-server` - Stop the HTTP API server
- Status bar shows API server state (green dot when running)

### Integration Flow

1. Start the plugin's API server using `semantic:start-api-server`
2. Build and start the MCP server with `npm run dev` in `mcp-server/`
3. The MCP server connects to the plugin's REST API on `http://localhost:3000`
4. External tools can use the MCP server to access semantic search via `semantic_search` tool

### MCP Server Configuration

The MCP server must be configured in Claude Code CLI's settings to enable the semantic search tool. The server runs on stdio transport and provides the `semantic_search` tool for querying the Obsidian knowledge base.

## Important Notes

- Vector stores require async initialization via `ServiceContainer.create()`
- LLM configurations must be properly set before service creation
- Submodules need separate dependency installation for development
- Chat service requires OpenAI API key for initialization
- Always create pure business logic services for complex operations to enable unit testing
- **MCP Integration**: The plugin's API server must be running before starting the MCP server
