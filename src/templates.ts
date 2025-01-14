import { App, TFile } from 'obsidian';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

declare global {
    interface Window {
        app: App;
    }
}

// The templates will be copied from the plugin's template directory
export async function getTemplates(): Promise<Record<string, string>> {
    const templates: Record<string, string> = {};
    const adapter = window.app.vault.adapter;
    const pluginDir = (adapter as any).getBasePath();
    const pluginTemplatesDir = join(pluginDir, '.obsidian', 'plugins', 'obsidian-knowledge-manager', 'templates');

    try {
        // Read templates directly from the plugin's template directory using Node's fs
        const files = readdirSync(pluginTemplatesDir);
        for (const file of files) {
            if (file.endsWith('.md')) {
                const content = readFileSync(join(pluginTemplatesDir, file), 'utf8');
                templates[file] = content;
            }
        }
    } catch (error) {
        console.error('Error reading plugin templates:', error);
    }

    return templates;
}
