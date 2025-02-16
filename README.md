# Knowledge Manager for Obsidian

Knowledge Manager is a powerful plugin for Obsidian that helps you organize, enhance, and integrate knowledge across your notes using AI-powered features.

## Features

### 1. Note Summarization
- Generate concise summaries of your notes using GPT models
- Maintain the key points while reducing length
- Perfect for quick review and understanding

### 2. Knowledge Diffusion
- Intelligently integrate new knowledge into existing notes
- Automatically handle content conflicts by prioritizing newer information
- Maintain document structure and readability
- Smart placement of new content based on context

### 3. Content Enhancement
- Improve document structure and readability
- Break down long paragraphs into bullet points when appropriate
- Add headers and subheaders for better organization
- Maintain consistent formatting using Markdown

## Requirements

- Obsidian v0.15.0 or higher
- OpenAI API key (for AI-powered features)

## Installation

1. Open Obsidian Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click Browse and search for "Knowledge Manager"
4. Install the plugin
5. Enable the plugin in your Community Plugins list

## Configuration

1. Open plugin settings
2. Enter your OpenAI API key
3. The plugin will automatically validate your API key

## Usage

### Summarizing Notes
1. Open the note you want to summarize
2. Use the command palette (Cmd/Ctrl + P)
3. Search for "Summarize Note" and select it
4. The summary will be generated using AI

### Knowledge Diffusion
The plugin helps integrate new knowledge into your existing notes while:
- Preserving document structure
- Handling content conflicts
- Improving readability
- Maintaining context

### Content Enhancement
- Automatically improves document structure
- Breaks down dense paragraphs
- Adds appropriate headers
- Enhances readability while preserving content

## Best Practices

1. Always review AI-generated content
2. Keep your OpenAI API key secure
3. Use summarization for longer documents
4. Let the plugin handle content conflicts in knowledge diffusion

## Support

If you encounter any issues or have suggestions:
- Open an issue on GitHub
- Check the existing issues first
- Provide as much detail as possible

## Developer Guide

### Project Structure

The project is organized into two main parts:
1. The main plugin code in the root directory
2. Shared libraries in the `src/libs/` directory, managed as git submodules:
   - `llm-utils`: Shared LLM (Large Language Model) services and utilities

### Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Initialize and install everything:
   ```bash
   npm run setup:dev
   ```
   This command will:
   - Initialize and update all git submodules
   - Install dependencies for the main plugin
   - Install dependencies for the `llm-utils` library

   If you only need the main plugin without developing the libraries:
   ```bash
   npm run setup
   ```

### Working with Submodules

When working with submodules, keep these commands handy:

1. Check for changes in submodules:
   ```bash
   git submodule foreach 'git status'
   ```

2. Update all submodules to their latest version:
   ```bash
   git submodule update --remote
   ```

3. After making changes in a submodule:
   ```bash
   # Inside the submodule directory
   git add .
   git commit -m "your changes"
   git push

   # Back in the main repository
   git add src/libs/llm-utils  # Update the submodule reference
   git commit -m "Update llm-utils submodule"
   git push
   ```

4. Check submodule status:
   ```bash
   git submodule status
   ```

### Initial Submodule Setup

If you need to set up the submodule for the first time:

1. Create `.gitmodules` file:
   ```
   [submodule "src/libs/llm-utils"]
       path = src/libs/llm-utils
       url = https://github.com/fabricehong/llm-utils.git
   ```

2. Initialize and update the submodule:
   ```bash
   git submodule init
   git submodule update
   ```

### Development Workflow

1. Make sure you're on the right branch:
   ```bash
   git checkout main  # or your feature branch
   ```

2. Start development:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

Built with:
- Obsidian API
- LangChain
- OpenAI GPT models
