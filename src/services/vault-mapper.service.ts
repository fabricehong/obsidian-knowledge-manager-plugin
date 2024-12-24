import { TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import { DirectoryNode, FileNode } from "../models/interfaces";

export class VaultMapperService {
    constructor(private vault: Vault) {}

    mapVault(): DirectoryNode {
        const rootFolder = this.vault.getRoot();
        return this.mapDirectory(rootFolder);
    }

    mapDirectory(folder: TFolder): DirectoryNode {
        const directoryNode: DirectoryNode = {
            name: folder.name,
            subdirectories: [],
            files: []
        };

        // Map all children
        for (const child of folder.children) {
            if (child instanceof TFile) {
                directoryNode.files.push(this.mapFile(child));
            } else if (child instanceof TFolder) {
                directoryNode.subdirectories.push(this.mapDirectory(child));
            }
        }

        // Sort subdirectories and files by name for consistent output
        directoryNode.subdirectories.sort((a, b) => a.name.localeCompare(b.name));
        directoryNode.files.sort((a, b) => a.name.localeCompare(b.name));

        return directoryNode;
    }

    getFolder(path: string): TFolder | null {
        const abstractFile = this.vault.getAbstractFileByPath(path);
        if (abstractFile instanceof TFolder) {
            return abstractFile;
        }
        return null;
    }

    private mapFile(file: TFile): FileNode {
        return {
            name: file.name
        };
    }

    getStringRepresentation(node: DirectoryNode, level: number = 0): string {
        const indent = '\t'.repeat(level);
        let result = `${indent}${node.name}/\n`;

        // Add subdirectories
        for (const subdir of node.subdirectories) {
            result += this.getStringRepresentation(subdir, level + 1);
        }

        // Add files
        for (const file of node.files) {
            result += `${indent}\t${file.name}\n`;
        }

        return result;
    }
}
