import { App, Notice, TFolder } from 'obsidian';
import { getTemplates } from '../templates';

export class TemplateManager {
    constructor(private app: App) {}

    async ensureTemplateDirectory(templateDir: string): Promise<TFolder | null> {
        let folder = this.app.vault.getAbstractFileByPath(templateDir) as TFolder;
        
        if (!folder) {
            try {
                await this.app.vault.createFolder(templateDir);
                folder = this.app.vault.getAbstractFileByPath(templateDir) as TFolder;
            } catch (error) {
                // Ignore error if folder already exists
                if (!(error instanceof Error) || !error.message.includes('already exists')) {
                    console.error('Error creating template directory:', error);
                    new Notice('Error creating template directory');
                    return null;
                }
                folder = this.app.vault.getAbstractFileByPath(templateDir) as TFolder;
            }
        }

        return folder;
    }

    async createTemplateFiles(templateDir: string): Promise<boolean> {
        try {
            const templates = await getTemplates();
            
            // Create all template files in parallel
            const operations = Object.entries(templates).map(async ([filename, content]) => {
                const targetPath = `${templateDir}/${filename}`;
                if (!this.app.vault.getAbstractFileByPath(targetPath)) {
                    await this.app.vault.create(targetPath, content);
                }
            });

            // Wait for all file operations to complete
            await Promise.all(operations);

            // Trigger a single refresh
            this.app.vault.trigger('file-index');
            
            return true;
        } catch (error) {
            console.error('Error creating template files:', error);
            new Notice('Error creating template files');
            return false;
        }
    }

    async initialize(templateDir: string): Promise<boolean> {
        const folder = await this.ensureTemplateDirectory(templateDir);
        if (!folder) {
            return false;
        }

        return this.createTemplateFiles(templateDir);
    }
}
