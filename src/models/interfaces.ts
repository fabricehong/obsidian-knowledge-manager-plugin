export interface PluginSettings {
    openAIApiKey: string;
    translationPromptTemplate: string;
    templateDirectory: string;
    headerContainingTranscript: string;
    replacementSpecsTag: string;
    vocabularySpecsTag: string;  // New setting for vocabulary files
}

export const DEFAULT_SETTINGS: PluginSettings = {
    openAIApiKey: '',
    translationPromptTemplate: '',
    templateDirectory: 'knowledge-manager-templates',
    headerContainingTranscript: 'Original',
    replacementSpecsTag: 'replacement-specs',
    vocabularySpecsTag: 'vocabulary',  // Default value for vocabulary files tag
}

export interface FileNode {
    name: string;
}

export interface DirectoryNode {
    name: string;
    subdirectories: DirectoryNode[];
    files: FileNode[];
}

export class HeaderNode {
    level: number;
    heading: string;
    children: HeaderNode[];
    content: string;

    constructor() {
        this.level = 0;
        this.heading = '';
        this.children = [];
        this.content = '';
    }
}

export class RootNode {
    children: HeaderNode[];
    content: string;

    constructor() {
        this.children = [];
        this.content = '';
    }
}

export interface DiffusionRepresentation {
    destination: string;
    toIntegrate: IntegrationPart[];
}

export interface IntegrationPart {
    breadcrumbs: string[];
    content: string;
}

export interface Intervention {
    speaker: string;
    text: string;
}

export interface ReplacementReport {
    category: string;
    replacements: ReplacementMatch[];
}

export interface ReplacementMatch {
    target: string;
    toSearch: string;  // The actual string that matched
}

export interface ReplacementSummary {
    replacements: {
        original: string;
        corrected: string;
        occurrences: number;
    }[];
    totalReplacements: number;
}

export interface ReplacementCount {
    from: string;
    to: string;
    count: number;
}

export interface ReplacementStatistics {
    category: string;
    replacements: ReplacementCount[];
}
