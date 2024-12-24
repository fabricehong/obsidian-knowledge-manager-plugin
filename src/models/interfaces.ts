export interface PluginSettings {
    openAIApiKey: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    openAIApiKey: ''
}

export interface FileNode {
    name: string;
}

export interface DirectoryNode {
    name: string;
    subdirectories: DirectoryNode[];
    files: FileNode[];
}

export interface HeaderNode {
    level: number;
    heading: string;
    position: {
        start: { line: number; col: number; offset: number; };
        end: { line: number; col: number; offset: number; };
    };
    children: HeaderNode[];
    content: string;  // Content under this heading before any subheadings
}

export interface RootNode {
    children: HeaderNode[];
    content: string;  // Content before any headings
}

export interface DiffusionRepresentation {
    destination: string;
    toIntegrate: IntegrationPart[];
}

export interface IntegrationPart {
    breadcrumbs: string[];
    content: string;
}
