import { TFile, Vault } from "obsidian";

export class FilePathService {
    generateDiffusedFilePath(originalFile: TFile, vault: Vault): string {
        const dir = originalFile.parent?.path || '';
        const baseName = originalFile.basename;
        const extension = originalFile.extension;
        
        // Start with a simple postfix
        let counter = 1;
        let newPath: string;
        
        do {
            // Format: "original-name.diffused-v1.md"
            const newName = `${baseName}.diffused-v${counter}.${extension}`;
            newPath = dir ? `${dir}/${newName}` : newName;
            counter++;
        } while (vault.getAbstractFileByPath(newPath));

        return newPath;
    }
}
