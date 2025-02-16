import { Glossary, Term } from "../../types/glossary";
import { z } from "zod";
import { AICompletionService } from "../interfaces/ai-completion.interface";
import { zodSchemaToJsonExample } from "../llm/utils/zod-schema.utils";

export class GlossarySearchService {
    private readonly INITIAL_PROMPT_TEMPLATE = `Tu es un assistant chargé de construire un glossaire à partir d'une transcription de meeting d'entreprise. Dans ces transcriptions, des erreurs phonétiques peuvent survenir (par exemple, dues à Whisper), et certains mots ou expressions mal retranscrits n'ont pas de sens dans le contexte de la phrase.

Ton objectif est d'identifier UNIQUEMENT les termes internes propres à l'entreprise. Pour cela, tu dois :

1. **Détecter et inclure uniquement les termes spécifiques internes**
   - Il s'agit de sigles, abréviations, codes, noms de projets, produits ou clients propres à l'entreprise.
   - Exemples : "V0bis", "TPG", "HACON", "VIB08".

2. **Exclure les mots et expressions génériques**
   - Ne retourne pas de mots courants ou de termes du langage professionnel habituel qui ne sont pas spécifiques à l'entreprise.
   - Par exemple, évite "point régulier", "accords de service", "rapproche", "atelier", "compte rendu", etc.
   - Cette règle permet de comprendre pourquoi certains mots précédemment retournés ne sont pas pertinents.

3. **Détecter les erreurs phonétiques de Whisper**
   - Identifie les termes qui semblent être mal retranscrits en raison d'erreurs phonétiques, c'est-à-dire qui n'ont pas de sens dans le contexte de la phrase.
   - Par exemple, "Vap'n'Roll Thierry" ou "Cayete test" doivent être signalés comme des erreurs potentielles.

4. **Détecter et exclure les expressions non-sens**
   - Identifie et ignore les expressions qui, bien qu'elles puissent ressembler à des termes internes, n'ont aucun sens dans le contexte d'un meeting d'entreprise.
   - Exemples : "France-Huisse-Euro" (au lieu de "franc Suisse-Euro").

5. **Définir les termes**
   - Pour chaque terme interne identifié, fournis une définition concise basée sur le contexte de la transcription.
   - Si le contexte ne permet pas d'en déduire la signification, indique simplement "-".

Note : Si c'est ta première itération de construction de glossaire, la variable is_new sera toujours vraie.

Voici la transcription :
"""
{input}
"""`;

    private readonly ITERATION_PROMPT_TEMPLATE = `fait un double check. liste uniquement les oublis ou les modifications.`;

    private debug: boolean = false;

    constructor(
        private readonly aiService: AICompletionService,
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
                    content: `${this.INITIAL_PROMPT_TEMPLATE.replace("{input}", content)}`
                },
                {
                    role: 'user' as const,
                    content: content
                }
            ];

            // Génération initiale
            let response = await this.aiService.generateStructuredResponseWithSchema<Glossary>(
                messages,
                glossarySchema,
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
                    role: 'user' as const,
                    content: `${this.ITERATION_PROMPT_TEMPLATE}
                    Glossaire précédent:
                    ${JSON.stringify(finalGlossary, null, 2)}`
                });

                // Ajouter le contenu utilisateur pour cette itération
                messages.push({
                    role: 'user' as const,
                    content: content
                });

                response = await this.aiService.generateStructuredResponseWithSchema<Glossary>(
                    messages,
                    glossarySchema
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
