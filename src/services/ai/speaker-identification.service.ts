// src/services/ai/speaker-identification.service.ts
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser, StructuredOutputParser } from "@langchain/core/output_parsers";
import { ExclusionsSchema, HypothesesSchema } from "../../models/ai-schemas";
import type { AICompletionService } from "../../libs/obsidian-utils/src/services/interfaces/ai-completion.interface";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { z } from 'zod';
import { LangChainTracer } from "langchain/callbacks";


export type FullSpeakerIdentificationOutput = {
    exclusions: any; // Parsed JSON from exclusionsChain
    hypotheses: any; // Parsed JSON from hypothesesChain
};


const exclusionsPromptText = `
{format_instructions}

STRUCTURE DU TRANSCRIPT : 
Le transcript est délimité par les labels "Speaker X:" suivis du texte de ce speaker.
Chaque nouveau "Speaker Y:" indique un changement de locuteur.

EXEMPLE DE STRUCTURE :
Speaker A:
[Tout le texte ici appartient à Speaker A jusqu'au prochain label]

Speaker B:
[Tout le texte ici appartient à Speaker B jusqu'au prochain label]

TÂCHE : Pour chaque speaker, liste UNIQUEMENT les prénoms qu'IL mentionne dans SES PROPRES paroles ET qui l'excluent.

RÈGLE SIMPLE : Un speaker ne peut PAS être quelqu'un à qui il s'adresse directement.

EXEMPLES AVEC DÉLIMITATIONS :
Speaker A:
Merci Paul pour ton aide.
→ Speaker A exclut "Paul"

Speaker B:
Paul, tu as raison. Je passe la parole à Marie.
→ Speaker B exclut "Paul" ET "Marie"

CONTRE-EXEMPLES (NE PAS EXCLURE) :
Speaker A:
Moi, Paul, je pense que...
→ Speaker A ne s'exclut PAS "Paul" (auto-identification)

MÉTHODE STRICTE :
1. Identifie le bloc de texte de "Speaker A:" (jusqu'au prochain "Speaker X:")
2. Dans CE BLOC UNIQUEMENT, cherche les prénoms auxquels Speaker A s'adresse
3. Mets ces prénoms dans les exclusions de Speaker A
4. Répète pour chaque speaker séparément

CRUCIAL : Ne confonds jamais les paroles d'un speaker avec celles d'un autre. Chaque speaker a ses propres exclusions basées UNIQUEMENT sur SES paroles délimitées.

Transcript :
"""
{transcript}
"""
`;

const hypothesesPromptText = `
{format_instructions}
Tu reçois le même transcript balisé (labels « Speaker X: »).

Étape : générer des HYPOTHÈSES de prénom pour chaque label, avec une courte raison ET un score de probabilité.
Indices possibles (liste non exhaustive) :
• Le tour immédiatement précédent passe explicitement la parole à N  
  (ex. « …la main, N »).  
• Le tour immédiatement suivant commence par « Merci N ».  
• Le locuteur se nomme lui-même « Moi, N, … ».  
• Tout autre indice contextuel crédible.

Pour chaque hypothèse, attribue un score entre 0 et 1 :
• 0.9-1.0 : Évidence très forte (auto-identification, passation directe)
• 0.7-0.8 : Évidence forte (contexte très clair)
• 0.5-0.6 : Évidence modérée (indices contextuels)
• 0.3-0.4 : Évidence faible (supposition)

Ne crée jamais de prénom absent du transcript.  
Ne renvoie **que** le JSON demandé.

Transcript :
"""
{transcript}
"""
`;


export class SpeakerIdentificationService {
    private llm: ChatOpenAI;
    private identifySpeakersRunnable!: RunnableSequence<
        { transcript: string; all_speakers_list: string[] },
        FullSpeakerIdentificationOutput
    >;
    private readonly chainsInitialized: Promise<void>;

    constructor(
        private readonly completionService: AICompletionService,
        private readonly tracer: LangChainTracer | undefined = undefined
    ) {
        this.llm = (completionService as any).model;
        this.chainsInitialized = this.initChains();
    }

    private async initChains() {
        // Structured parsers pour les 2 phases IA seulement
        const exclusionsParser = StructuredOutputParser.fromZodSchema(ExclusionsSchema);
        const hypothesesParser = StructuredOutputParser.fromZodSchema(HypothesesSchema);

        // Génère les instructions de formatage pour chaque étape
        const exclusionsFormatInstructions = exclusionsParser.getFormatInstructions();
        const hypothesesFormatInstructions = hypothesesParser.getFormatInstructions();

        // Await sur PromptTemplate pour chaque étape
        const exclusionsPrompt = await PromptTemplate.fromTemplate(exclusionsPromptText)
            .partial({ format_instructions: exclusionsFormatInstructions });
        const hypothesesPrompt = await PromptTemplate.fromTemplate(hypothesesPromptText)
            .partial({ format_instructions: hypothesesFormatInstructions });

        const exclusionsProcessingChain = exclusionsPrompt.pipe(this.llm).pipe(exclusionsParser);
        const hypothesesProcessingChain = hypothesesPrompt.pipe(this.llm).pipe(hypothesesParser);

        this.identifySpeakersRunnable = RunnablePassthrough
            // Input: { transcript: string; all_speakers_list: string[] }
            .assign({
                // Phase 1: Run exclusionsChain
                exclusions_obj: RunnableSequence.from([
                    (input: { transcript: string }) => ({ transcript: input.transcript }),
                    exclusionsProcessingChain
                ]),
                // Phase 2: Run hypothesesChain
                hypotheses_obj: RunnableSequence.from([
                    (input: { transcript: string }) => ({ transcript: input.transcript }),
                    hypothesesProcessingChain
                ])
            })
            // Phase 3 sera programmatique dans EditorAISpeakerIdentificationService
            .pipe(
                // Return only exclusions and hypotheses for programmatic resolution
                (data: { exclusions_obj: any; hypotheses_obj: any }) => ({
                    exclusions: data.exclusions_obj,
                    hypotheses: data.hypotheses_obj,
                })
            ) as RunnableSequence<{ transcript: string; all_speakers_list: string[] }, FullSpeakerIdentificationOutput>;
    }

    /**
     * Identifie automatiquement les speakers d'un transcript en utilisant l'IA et la logique programmatique.
     * 
     * @description
     * Processus en 3 phases pour désanonymiser un transcript contenant des labels génériques ("Speaker A", "Speaker B"):
     * 
     * **Phase 1 - Exclusions (IA):**
     * Analyse le transcript pour identifier les prénoms que chaque speaker ne peut PAS être.
     * Logique: quand un speaker s'adresse directement à quelqu'un ("Merci Paul"), 
     * ce speaker ne peut pas être Paul lui-même.
     * 
     * **Phase 2 - Hypothèses (IA):**
     * Génère des candidats de prénoms pour chaque speaker avec scores de probabilité (0-1).
     * Indices utilisés: passation de parole, remerciements, auto-identification, contexte.
     * Chaque hypothèse inclut: nom candidat + raison + score de confiance.
     * 
     * **Phase 3 - Résolution (Programmatique):**
     * Applique une logique stricte pour déterminer le prénom final:
     * 1. Filtre les hypothèses en supprimant tous les prénoms exclus (priorité absolue aux exclusions)
     * 2. Trie les hypothèses restantes par score décroissant
     * 3. Sélectionne l'hypothèse avec le meilleur score
     * 4. Si aucune hypothèse valide: conserve le label original
     * 
     * @param transcript Le contenu textuel du transcript avec labels "Speaker X:"
     * @param allSpeakerLabels Liste des labels uniques trouvés dans le transcript (ex: ["Speaker A", "Speaker B"])
     * @returns Résultat complet contenant exclusions, hypothèses et résolutions finales
     * 
     * @throws Error si la clé API OpenAI n'est pas configurée
     * @throws Error si l'IA échoue à analyser le transcript
     * 
     * @example
     * ```typescript
     * const result = await service.identifySpeakers(
     *   "Speaker A: Bonjour Paul!\nSpeaker B: Merci Marie pour cette introduction...", 
     *   ["Speaker A", "Speaker B"]
     * );
     * // result.exclusions: {"Speaker A": ["Paul"], "Speaker B": ["Marie"]}
     * // result.hypotheses: {"Speaker A": [{"nom": "Marie", "score": 0.8, "raison": "..."}]}
     * // result.resolvedSpeakers: {"Speaker A": {"nom": "Marie", "confiance": 0.8}}
     * ```
     */
    public async identifySpeakers(transcript: string, allSpeakerLabels: string[]): Promise<FullSpeakerIdentificationOutput> {
        if (!this.llm.apiKey) {
            console.error("OpenAI API key is not configured.");
            throw new Error("OpenAI API key is not configured. Please set it in the plugin settings.");
        }
        try {
            await this.chainsInitialized;
            const callbacks = this.tracer ? [this.tracer] : undefined;
            return await this.identifySpeakersRunnable.invoke({
                transcript: transcript,
                all_speakers_list: allSpeakerLabels,
            }, { callbacks });
        } catch (error) {
            console.error("Error during speaker identification:", error);
            throw new Error("Failed to identify speakers using AI. Check console for details.");
        }
    }
}
