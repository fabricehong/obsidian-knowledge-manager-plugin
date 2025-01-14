export interface PluginSettings {
    openAIApiKey: string;
    translationPromptTemplate: string;
    templateDirectory: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    openAIApiKey: '',
    translationPromptTemplate: '',
    templateDirectory: 'knowledge-manager-templates',
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
