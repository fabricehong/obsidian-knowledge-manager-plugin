import { Glossary, Term } from "../types/glossary";
import { z } from "zod";
import { AICompletionService } from "./interfaces/ai-completion.interface";
import { zodSchemaToJsonExample } from "../utils/zod-schema.utils";

export class GlossarySearchService {
    private debug: boolean = false;

    constructor(
        private readonly aiService: AICompletionService,
        private readonly initialPromptTemplate: string,
        private readonly iterationPromptTemplate: string,
        debug: boolean = false
    ) {
        this.debug = debug;
    }

    private log(...args: any[]) {
        if (this.debug) {
            console.log(...args);
        }
    }

    async findGlossaryTerms(content: string, maxTry: number): Promise<Glossary> {
        // Définition du schéma pour la validation
        const glossarySchema = z.object({
            termes: z.array(z.object({
                terme: z.string().describe("le terme technique trouvé"),
                definition: z.string().describe("la définition du terme trouvé dans la transcription, ou '-' si non trouvé"),
                is_new: z.boolean().describe("true si c'est un nouveau terme")
            }))
        });

        try {
            // Initialisation des messages avec le template initial
            let messages = [
                {
                    role: 'system' as const,
                    content: `${this.initialPromptTemplate}
                    Réponds en JSON avec le format suivant:
                    ${zodSchemaToJsonExample(glossarySchema)}`
                },
                {
                    role: 'user' as const,
                    content: content
                }
            ];

            // Génération initiale
            let response = await this.aiService.generateStructuredResponse<Glossary>(
                messages,
            );

            // Initialiser le glossaire final avec la première réponse
            let finalGlossary: Glossary = {
                termes: [...response.termes]
            };

            this.log("\n📚 Glossaire initial:", 
                finalGlossary.termes.map(t => `\n  - ${t.terme}: ${t.definition}`).join('')
            );

            let tries = 0;

            // Itérations pour affiner le glossaire
            while (tries < maxTry) {
                // Ajouter le message système pour l'itération
                messages.push({
                    role: 'system' as const,
                    content: `${this.iterationPromptTemplate}
                    Glossaire précédent:
                    ${JSON.stringify(finalGlossary, null, 2)}
                    
                    Réponds en JSON avec le même format que précédemment.`
                });

                // Ajouter le contenu utilisateur pour cette itération
                messages.push({
                    role: 'user' as const,
                    content: content
                });

                response = await this.aiService.generateStructuredResponse<Glossary>(
                    messages,
                );

                this.log(`\n📝 Itération ${tries + 1}:`,
                    response.termes.map(t => `\n  - ${t.terme}: ${t.definition}${t.is_new ? ' (nouveau)' : ''}`).join('')
                );

                // Mettre à jour le glossaire final avec les nouveaux termes (logique Python)
                const updatedTerms = new Map(response.termes.map(term => [term.terme, term]));
                const finalTerms = new Map(finalGlossary.termes.map(term => [term.terme, term]));
                
                // Fusionner les maps, en donnant la priorité aux nouveaux termes
                updatedTerms.forEach((term, key) => {
                    finalTerms.set(key, term);
                });
                
                finalGlossary = {
                    termes: Array.from(finalTerms.values())
                };

                // Si aucun nouveau terme n'est trouvé, on arrête
                if (!response.termes.some(term => term.is_new)) {
                    this.log("\n✨ Aucun nouveau terme trouvé, arrêt des itérations");
                    break;
                }

                tries++;
            }

            if (tries >= maxTry) {
                this.log(`\n⚠️ Nombre maximum d'essais atteint (${maxTry})`);
            }

            this.log("\n🎯 Glossaire final:", 
                finalGlossary.termes.map(t => `\n  - ${t.terme}: ${t.definition}`).join('')
            );

            return finalGlossary;
        } catch (error) {
            console.error("❌ Erreur lors de la génération du glossaire:", error);
            throw error;
        }
    }
}
