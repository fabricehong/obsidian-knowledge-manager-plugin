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
    exclusions: z.infer<typeof ExclusionsSchema>; // Record<string, string[]>
    hypotheses: z.infer<typeof HypothesesSchema>; // Record<string, Array<{nom: string, raison: string, score: number}>>
};


const exclusionsPromptText = `
{format_instructions}

CONTEXTE ET OBJECTIF :
Tu analyses un transcript de réunion où les vrais noms des participants ont été remplacés par des labels anonymes ("Speaker A", "Speaker B", etc.). 
Pour désanonymiser ce transcript, tu dois d'abord identifier qui chaque speaker NE PEUT PAS être, en analysant leur façon de s'adresser aux autres participants.

TÂCHE :
Pour chaque speaker, identifie tous les prénoms qu'il NE PEUT PAS être, basé sur ses propres paroles.
La logique est simple : si quelqu'un s'adresse directement à une personne, il ne peut pas être cette personne.

EXEMPLES DE LOGIQUE CONVERSATIONNELLE :

Speaker A dit : "Merci Paul pour ton aide"
→ Speaker A s'adresse à Paul, donc Speaker A ≠ Paul

Speaker B dit : "Paul, tu as raison. Marie, qu'en penses-tu ?"
→ Speaker B s'adresse à Paul et Marie, donc Speaker B ≠ Paul ET Speaker B ≠ Marie

Speaker C dit : "Moi, Jean, je pense que c'est une bonne idée"
→ Speaker C s'identifie comme Jean, donc AUCUNE exclusion (auto-identification)

COMMENT PROCÉDER :
1. Examine chaque intervention de speaker individuellement
2. Identifie tous les prénoms auxquels ce speaker s'adresse directement
3. Ces prénoms deviennent des exclusions pour ce speaker
4. Ignore les auto-identifications ("Moi, X..." ou "Je suis X...")

Speakers à analyser : {all_speakers_list}

IMPORTANT :
• Analyse uniquement les propres paroles de chaque speaker
• Base-toi sur la logique conversationnelle naturelle
• Une personne ne peut pas s'adresser à elle-même dans une conversation
• Génère des exclusions UNIQUEMENT pour les speakers listés ci-dessus

Transcript à analyser :
"""
{transcript}
"""
`;

const hypothesesPromptText = `
{format_instructions}

CONTEXTE ET OBJECTIF :
Tu analyses un transcript de réunion où les vrais noms des participants ont été remplacés par des labels anonymes ("Speaker A", "Speaker B", etc.). 
Ton objectif est de désanonymiser ce transcript en identifiant qui est réellement chaque speaker, en analysant les indices contextuels dans la conversation.

TÂCHE :
Pour chaque label de speaker, génère des hypothèses sur l'identité réelle de cette personne. 
Chaque hypothèse doit inclure :
• Le prénom candidat
• Une explication claire de pourquoi ce prénom correspond à ce speaker
• Un score de probabilité entre 0 et 1

BONS INDICES - Exemples de vraies hypothèses :

• Passation directe : "Paul, à toi maintenant" → le speaker suivant = Paul
  (Transition claire de parole vers une personne spécifique)

• Remerciement pour intervention précédente : "Merci Marie pour cette explication" → speaker précédent = Marie
  (Remerciement APRÈS une intervention suggère qui vient de parler)

• Auto-identification explicite : "Moi, Jean, je pense que..." → ce speaker = Jean
  (La personne se nomme directement)

• Confirmation d'identité : "Oui, c'est bien moi, Sophie" → ce speaker = Sophie
  (Validation explicite de son identité)

MAUVAIS INDICES - Exemples de NON-hypothèses :

• Simple mention : "J'ai discuté avec Thomas hier" → Speaker ≠ Thomas
  (Parler DE quelqu'un n'indique pas qu'on EST cette personne)

• Relation professionnelle : "Mon collègue Pierre m'a envoyé un mail" → Speaker ≠ Pierre
  (Avoir une relation avec quelqu'un ne signifie pas être cette personne)

• Action dirigée vers autrui : "Je vais voir Sophie à 15h" → Speaker ≠ Sophie
  (Aller voir quelqu'un implique qu'on n'est pas cette personne)

• Discussion sur absence : "Lucas n'est pas disponible" → Speaker ≠ Lucas
  (Parler de l'absence de quelqu'un à la 3ème personne)

RÈGLE FONDAMENTALE : 
Une "relation" ou "mention" de quelqu'un N'EST PAS un indice d'identité.
Seules les références DIRECTES (passation, remerciement, auto-identification) sont valides.

IMPORTANT - Pas d'hypothèse forcée :
• Il est PARFAITEMENT ACCEPTABLE qu'un speaker n'ait AUCUNE hypothèse
• Si aucun indice valide n'existe pour un speaker, laisse sa liste vide : []
• Mieux vaut AUCUNE hypothèse qu'une hypothèse faible basée sur de simples mentions
• La qualité prime sur la quantité - ne force jamais d'hypothèses douteuses

EXEMPLE DE RÉPONSE ACCEPTABLE :
{{
  "Speaker A": [{{"nom": "Paul", "raison": "...", "score": 0.9}}],
  "Speaker B": [],  // Aucun indice valide trouvé
  "Speaker C": [{{"nom": "Marie", "raison": "...", "score": 0.8}}]
}}

SCORES DE PROBABILITÉ :
• 0.9-1.0 : Évidence très forte (auto-identification claire, passation directe explicite)
• 0.7-0.8 : Évidence forte (contexte conversationnel très clair)
• 0.5-0.6 : Évidence modérée (indices contextuels cohérents)
• 0.3-0.4 : Évidence faible (supposition basée sur des indices faibles)

Speakers à analyser : {all_speakers_list}

IMPORTANT : 
• Utilise uniquement les prénoms présents dans le transcript
• Base-toi sur la logique conversationnelle naturelle
• Chaque hypothèse doit avoir une justification claire
• Génère des hypothèses UNIQUEMENT pour les speakers listés ci-dessus

Transcript à analyser :
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
                    (input: { transcript: string; all_speakers_list: string[] }) => ({ 
                        transcript: input.transcript,
                        all_speakers_list: input.all_speakers_list.join(", ")
                    }),
                    exclusionsProcessingChain
                ]),
                // Phase 2: Run hypothesesChain
                hypotheses_obj: RunnableSequence.from([
                    (input: { transcript: string; all_speakers_list: string[] }) => ({ 
                        transcript: input.transcript,
                        all_speakers_list: input.all_speakers_list.join(", ")
                    }),
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
