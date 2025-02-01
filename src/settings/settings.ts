import { HeaderNode } from '../models/header-node';

export interface LLMOrganization {
    id: string;        // ID interne unique (UUID)
    name: string;      // Nom affiché à l'utilisateur
    apiKey: string;
    baseUrl: string;
    supportedModels: string[];
}

export interface LLMConfiguration {
    id: string;        // ID interne unique (UUID)
    name: string;      // Nom affiché à l'utilisateur
    organisationId: string;  // Référence à l'ID interne de l'organisation
    model: string;
}

export interface RootNode {
    content: string;
    children: HeaderNode[];
}

export interface PluginSettings {
    llmOrganizations: LLMOrganization[];
    llmConfigurations: LLMConfiguration[];
    selectedLlmConfiguration: string;
    headerContainingTranscript: string;
    templateDirectory: string;
    translationPromptTemplate: string;
    replacementSpecsTag: string;
    vocabularySpecsTag: string;
    maxGlossaryIterations: number;
    replacementsHeader: string;
    assemblyAiApiKey: string;
    transcriptionFolder: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    llmOrganizations: [
        {
            id: generateId('org'),
            name: 'OpenAI',
            apiKey: '',
            baseUrl: '',  // URL par défaut d'OpenAI
            supportedModels: ['gpt-4o', 'gpt-4o-mini']
        },
        {
            id: generateId('org'),
            name: 'DeepSeek',
            apiKey: '',
            baseUrl: 'https://api.deepseek.com',
            supportedModels: ['deepseek-chat', 'deepseek-reasoner']
        }
    ],
    llmConfigurations: [
        {
            id: generateId('cfg'),
            name: 'OpenAI GPT-4',
            organisationId: '',  // Sera mis à jour après la création des organisations
            model: 'gpt-4o',
        },
        {
            id: generateId('cfg'),
            name: 'DeepSeek Chat',
            organisationId: '',  // Sera mis à jour après la création des organisations
            model: 'deepseek-chat',
        }
    ],
    selectedLlmConfiguration: '',  // Sera mis à jour après la création des configurations
    headerContainingTranscript: 'Original',
    templateDirectory: 'knowledge-manager-templates',
    translationPromptTemplate: '',
    replacementSpecsTag: 'replacement-specs',
    vocabularySpecsTag: 'vocabulary',
    maxGlossaryIterations: 5,
    replacementsHeader: 'Replacements',
    assemblyAiApiKey: '',
    transcriptionFolder: ''
};

/**
 * Génère un ID unique pour une nouvelle organisation ou configuration
 */
export function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Met à jour les références après la création des organisations par défaut
 */
export function updateDefaultReferences(settings: PluginSettings) {
    // Met à jour les références des configurations par défaut
    settings.llmConfigurations[0].organisationId = settings.llmOrganizations[0].id;
    settings.llmConfigurations[1].organisationId = settings.llmOrganizations[1].id;
    settings.selectedLlmConfiguration = settings.llmConfigurations[0].id;
}
