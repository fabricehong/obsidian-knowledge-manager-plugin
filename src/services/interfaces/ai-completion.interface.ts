import { LLMConfiguration, LLMOrganization } from "../../settings/settings";
import { z } from 'zod';

export interface LLMContext {
    organization: LLMOrganization;
    configuration: LLMConfiguration;
}

export interface AICompletionService {
    /**
     * Génère une réponse structurée à partir d'un prompt (méthode legacy)
     * @deprecated Utiliser generateStructuredResponseWithSchema à la place
     * @param messages Liste des messages de contexte et prompt
     * @returns La réponse structurée
     */
    generateStructuredResponse<T>(
        messages: Array<{role: 'system' | 'user' | 'assistant', content: string}>,
    ): Promise<T>;

    /**
     * Génère une réponse structurée à partir d'un prompt et d'un schéma Zod
     * @param messages Liste des messages de contexte et prompt
     * @param schema Le schéma Zod définissant la structure de la réponse
     * @returns La réponse structurée et validée selon le schéma
     */
    generateStructuredResponseWithSchema<T extends Record<string, any>>(
        messages: Array<{role: 'system' | 'user' | 'assistant', content: string}>,
        schema: z.ZodSchema<T>
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
