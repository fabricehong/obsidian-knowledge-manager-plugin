import { HeaderNode } from '../models/header-node';

export interface RootNode {
    content: string;
    children: HeaderNode[];
}

export interface ReplacementSpecs {
    [key: string]: string;
}

export interface PluginSettings {
    openAIApiKey: string;
    headerContainingTranscript: string;
    templateDirectory: string;
    translationPromptTemplate: string;
    replacementSpecsTag: string;
    vocabularySpecsTag: string;
    glossaryInitialPromptTemplate: string;
    glossaryIterationPromptTemplate: string;
    maxGlossaryIterations: number;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    openAIApiKey: '',
    headerContainingTranscript: 'Original',
    templateDirectory: 'knowledge-manager-templates',
    translationPromptTemplate: '',
    replacementSpecsTag: 'ReplacementSpecs',
    vocabularySpecsTag: 'vocabulary',
    glossaryInitialPromptTemplate: '',
    glossaryIterationPromptTemplate: '',
    maxGlossaryIterations: 5
};
