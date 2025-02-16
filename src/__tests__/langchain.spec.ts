import { ChatOpenAI } from "@langchain/openai";
import OpenAI from "openai";
import { z } from 'zod';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const TIMEOUT = 30000;

// Schéma compatible avec OpenAI function calling
const VocabularySpecSchemaOpenAI = z.object({
    category: z.string().describe('Category must not be empty'),
    vocabulary: z.array(z.string().describe('Vocabulary term must not be empty'))
        .describe('Must have at least one vocabulary term')
});

describe.skip('LangChain Tests', () => {
    it('should make a simple call to OpenAI via LangChain', async () => {
        const model = new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "gpt-3.5-turbo",
            maxRetries: 2,
            temperature: 0
        });

        const result = await model.invoke([
            new SystemMessage("You are a helpful assistant that translates English to French."),
            new HumanMessage("I love programming.")
        ]);

        expect(result.content).toBeDefined();
    }, TIMEOUT);

    it('should make a simple call to Gemini via LangChain', async () => {
        const model = new ChatGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY,
            modelName: "gemini-2.0-pro-exp-02-05",
            maxRetries: 2,
            temperature: 0
        });

        const result = await model.invoke([
            new SystemMessage("You are a helpful assistant that translates English to French."),
            new HumanMessage("I love programming.")
        ]);

        expect(result.content).toBeDefined();
    }, TIMEOUT);

    // Note: Pour le structured output avec Gemini, il est préférable d'utiliser gemini-2.0-flash plutôt que gemini-2.0-pro-exp-02-05.
    // Le modèle Flash a un meilleur support pour le "forced function calling" qui est nécessaire pour le structured output.
    // Le modèle Pro Exp peut générer l'erreur "No parseable tool calls provided to GoogleGenerativeAIToolsOutputParser"
    // car il ne génère pas toujours la réponse dans le format attendu par le parser de LangChain.
    // Le problème vient de la façon dont LangChain gère les "tool calls" avec Gemini. Une solution possible serait
    // d'utiliser le paramètre tool_choice: "any" pour forcer l'utilisation des function calls, mais ce support
    // n'a été ajouté que récemment pour Gemini Flash et n'est pas encore implémenté dans withStructuredOutput.
    test('should generate VocabularySpecs using withStructuredOutput', async () => {
        const model = new ChatGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY,
            modelName: "gemini-2.0-pro-exp-02-05", //  gemini-2.0-flash
            maxRetries: 2,
            temperature: 0
        });

        // Créer un modèle avec sortie structurée
        const modelWithStructure = model.withStructuredOutput(VocabularySpecSchemaOpenAI);

        // Appeler le modèle avec une simple instruction
        const result = await modelWithStructure.invoke([
            {
                role: "system",
                content: "Tu es un assistant qui génère un vocabulaire technique dans une catégorie donnée."
            },
            {
                role: "user",
                content: "Génère un vocabulaire technique pour la catégorie 'Intelligence Artificielle' avec au moins 5 termes."
            }
        ]);

        console.log("Structured result:", JSON.stringify(result, null, 2));

        // Vérifier la structure
        expect(result).toBeDefined();
        expect(result.category).toBe("Intelligence Artificielle");
        expect(result.vocabulary).toBeDefined();
        expect(result.vocabulary.length).toBeGreaterThanOrEqual(5);
        expect(result.vocabulary.every(term => typeof term === 'string' && term.length > 0)).toBe(true);
    }, TIMEOUT);
});
