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
    maxGlossaryIterations: number;
    replacementsHeader: string;
    /* Example of template file settings
    glossaryInitialPromptTemplate: string;
    glossaryIterationPromptTemplate: string;
    */
}

export const DEFAULT_SETTINGS: PluginSettings = {
    openAIApiKey: '',
    headerContainingTranscript: 'Original',
    templateDirectory: 'knowledge-manager-templates',
    translationPromptTemplate: '',
    replacementSpecsTag: 'Replacements',
    vocabularySpecsTag: 'vocabulary',
    maxGlossaryIterations: 5,
    replacementsHeader: 'Replacements'
    /* Example of template file default values
    glossaryInitialPromptTemplate: '',
    glossaryIterationPromptTemplate: '',
    */
};
