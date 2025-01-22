import { ChatOpenAI } from "@langchain/openai";
import OpenAI from "openai";

describe.skip('OpenAI Tests', () => {
    // Configuration commune
    const API_KEY = process.env.OPENAI_API_KEY;
    const TIMEOUT = 30000;

    beforeAll(() => {
        if (!API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }
    });

    // Test 1: Simple appel à OpenAI via LangChain
    test('should make a simple call to OpenAI via LangChain', async () => {
        const model = new ChatOpenAI({
            openAIApiKey: API_KEY,
            model: "gpt-4o",
            temperature: 0,
            timeout: 20000,
            callbacks: [
                {
                    handleLLMStart: async (llm: any, prompts: string[]) => {
                        console.log(" OpenAI - Début de l'appel avec prompt:", prompts);
                    },
                    handleLLMEnd: async (output: any) => {
                        console.log(" OpenAI - Fin de l'appel, réponse:", output);
                    },
                    handleLLMError: async (err: Error) => {
                        console.error(" OpenAI - Erreur lors de l'appel:", err);
                    }
                }
            ]
        });

        const result = await model.invoke([
            {
                role: "user",
                content: "Réponds simplement 'OK' à ce message."
            }
        ]);
        
        console.log("Result:", JSON.stringify(result, null, 2));
        expect(result).toBeDefined();
        expect(result.content).toBe("OK");
    }, TIMEOUT);

    // Test 2: Simple appel direct à l'API OpenAI
    test('should make a simple call directly to OpenAI API', async () => {
        const openai = new OpenAI({
            apiKey: API_KEY,
            timeout: 20000,
        });

        console.log("Calling OpenAI API directly...");
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: "Réponds simplement 'OK' à ce message." }],
            temperature: 0,
        });

        console.log("Direct OpenAI response:", JSON.stringify(completion, null, 2));
        expect(completion.choices[0].message.content).toBe("OK");
    }, TIMEOUT);
});
