export interface KnowledgeManagerSettings {
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

export const DEFAULT_SETTINGS: KnowledgeManagerSettings = {
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
