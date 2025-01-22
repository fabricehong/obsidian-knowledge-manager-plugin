export interface AICompletionService {
    /**
     * Initialise le service avec une clé API
     */
    initialize(apiKey: string): void;

    /**
     * Génère une réponse structurée à partir d'un prompt
     * @param messages Liste des messages de contexte et prompt
     * @returns La réponse structurée
     */
    generateStructuredResponse<T>(
        messages: Array<{role: 'system' | 'user' | 'assistant', content: string}>,
    ): Promise<T>;

    /**
     * Génère une réponse textuelle simple
     * @param messages Liste des messages de contexte et prompt
     * @returns La réponse sous forme de texte
     */
    generateTextResponse(
        messages: Array<{role: 'system' | 'user' | 'assistant', content: string}>
    ): Promise<string>;
}
