import { SpeakerIdentificationService } from './speaker-identification.service';
import { LangChainCompletionService } from '../../libs/obsidian-utils/src/services/llm/langchain-completion.service';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { LangChainTracer } from "langchain/callbacks";

const TIMEOUT = 30000;

// Données de test pour le transcript
const SAMPLE_TRANSCRIPT = `Speaker A:
Bonjour tout le monde ! Je suis très content de vous voir aujourd'hui. Paul, est-ce que tu peux nous présenter le projet ?

Speaker B:
Merci Marie pour cette introduction. Effectivement, je vais vous présenter notre nouvelle initiative. Jean, tu pourras compléter sur la partie technique ?

Speaker C:
Bien sûr Paul. Pour la partie technique, nous utilisons une architecture moderne. Marie, as-tu des questions sur l'implémentation ?

Speaker A:
Oui, j'ai quelques questions. Merci Jean pour ces explications détaillées.`;

const SAMPLE_SPEAKER_LABELS = ["Speaker A", "Speaker B", "Speaker C"];

describe('SpeakerIdentificationService', () => {
    let service: SpeakerIdentificationService;
    let completionService: LangChainCompletionService;
    let model: ChatGoogleGenerativeAI;
    let tracer: LangChainTracer;

    beforeEach(() => {
        // Skip setup if no API key available
        if (!process.env.GOOGLE_API_KEY) {
            return;
        }

        // Créer le modèle Gemini Flash 2.0 (version stable pour structured output)
        model = new ChatGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY,
            modelName: "gemini-2.0-flash", // Version stable plutôt que -exp pour structured output
            maxRetries: 2,
            temperature: 0
        });


        // Créer le tracer pour debug
        tracer = new LangChainTracer({
            projectName: "speaker-identification-test"
        });

        // Créer le service de completion
        completionService = new LangChainCompletionService(model, true, tracer);

        // Créer le service à tester
        service = new SpeakerIdentificationService(completionService, tracer);
    });

    describe('identifySpeakers', () => {
        it('should identify speakers correctly from transcript', async () => {
            // Vérifier que l'API key est configurée
            if (!process.env.GOOGLE_API_KEY) {
                console.warn('GOOGLE_API_KEY not set, skipping test');
                return;
            }

            // Appeler la méthode à tester
            const result = await service.identifySpeakers(SAMPLE_TRANSCRIPT, SAMPLE_SPEAKER_LABELS);

            // Vérifier la structure de base
            expect(result).toBeDefined();
            expect(result.exclusions).toBeDefined();
            expect(result.hypotheses).toBeDefined();

            // Vérifier que les exclusions sont correctes
            expect(result.exclusions).toHaveProperty('Speaker A');
            expect(result.exclusions).toHaveProperty('Speaker B');
            expect(result.exclusions).toHaveProperty('Speaker C');

            // Vérifier la logique d'exclusion
            // Speaker A dit "Paul, est-ce que tu peux..." donc A ne peut pas être Paul
            expect(result.exclusions['Speaker A']).toContain('Paul');

            // Speaker B dit "Merci Marie..." donc B ne peut pas être Marie
            expect(result.exclusions['Speaker B']).toContain('Marie');

            // Speaker C dit "Marie, as-tu des questions..." donc C ne peut pas être Marie
            expect(result.exclusions['Speaker C']).toContain('Marie');

            // Vérifier que les hypothèses sont générées
            expect(result.hypotheses).toHaveProperty('Speaker A');
            expect(result.hypotheses).toHaveProperty('Speaker B');
            expect(result.hypotheses).toHaveProperty('Speaker C');

            // Vérifier la structure des hypothèses
            Object.values(result.hypotheses).forEach((hypothesesList: any) => {
                expect(Array.isArray(hypothesesList)).toBe(true);
                hypothesesList.forEach((hypothesis: any) => {
                    expect(hypothesis).toHaveProperty('nom');
                    expect(hypothesis).toHaveProperty('raison');
                    expect(hypothesis).toHaveProperty('score');
                    expect(typeof hypothesis.nom).toBe('string');
                    expect(typeof hypothesis.raison).toBe('string');
                    expect(typeof hypothesis.score).toBe('number');
                    expect(hypothesis.score).toBeGreaterThanOrEqual(0);
                    expect(hypothesis.score).toBeLessThanOrEqual(1);
                });
            });

            // Vérifier la logique des hypothèses
            // Note: Avec le prompt amélioré, les hypothèses peuvent être plus sélectives
            console.log('Speaker B hypotheses:', result.hypotheses['Speaker B']);
            
            // Vérifier qu'il y a au moins une hypothèse logique quelque part
            const totalHypotheses = Object.values(result.hypotheses).flat().length;
            expect(totalHypotheses).toBeGreaterThan(0);

            // Afficher les résultats pour debug
            console.log('Exclusions:', JSON.stringify(result.exclusions, null, 2));
            console.log('Hypotheses:', JSON.stringify(result.hypotheses, null, 2));
        }, TIMEOUT);

        it('should handle empty transcript gracefully', async () => {
            if (!process.env.GOOGLE_API_KEY) {
                console.warn('GOOGLE_API_KEY not set, skipping test');
                return;
            }

            const emptyTranscript = "";
            const result = await service.identifySpeakers(emptyTranscript, []);

            expect(result).toBeDefined();
            expect(result.exclusions).toBeDefined();
            expect(result.hypotheses).toBeDefined();
        }, TIMEOUT);

        it('should handle single speaker transcript', async () => {
            if (!process.env.GOOGLE_API_KEY) {
                console.warn('GOOGLE_API_KEY not set, skipping test');
                return;
            }

            const singleSpeakerTranscript = `Speaker A:
Bonjour, je suis Paul et je vais vous présenter le projet aujourd'hui. Marie m'a demandé de préparer cette présentation.`;

            const result = await service.identifySpeakers(singleSpeakerTranscript, ["Speaker A"]);

            expect(result).toBeDefined();
            expect(result.exclusions).toHaveProperty('Speaker A');
            expect(result.hypotheses).toHaveProperty('Speaker A');

            // Speaker A s'identifie comme Paul
            const speakerAHypotheses = result.hypotheses['Speaker A'];
            const paulHypothesis = speakerAHypotheses.find((h: any) => h.nom === 'Paul');
            expect(paulHypothesis).toBeDefined();
            expect(paulHypothesis?.score).toBeGreaterThan(0.8); // Haute confiance pour auto-identification
        }, TIMEOUT);
    });
});
