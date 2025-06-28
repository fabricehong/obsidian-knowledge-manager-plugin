import { z } from 'zod';

// Speaker info for one label
export const SpeakerInfoSchema = z.object({
  nom: z.union([z.string(), z.array(z.string()), z.null()]).describe("Nom(s) possible(s) pour ce speaker"),
  confiance: z.union([z.number(), z.array(z.number())]).describe("Score(s) de confiance pour chaque nom")
}).describe("Informations extraites pour un speaker (nom et confiance)");

export const SpeakerOutputSchema = z.record(
  z.string().describe("Label du speaker (ex: 'Speaker A')"),
  SpeakerInfoSchema
).describe("Objet associant chaque speaker à ses informations d'identification");

export const ExclusionsSchema = z.record(
  z.string().describe("Label du speaker (ex: 'Speaker A')"),
  z.array(z.string().describe("Prénom exclu pour ce speaker")).describe("Liste des prénoms exclus pour ce speaker")
).describe("Objet associant chaque speaker à la liste de prénoms exclus");

export const HypothesesSchema = z.record(
  z.string().describe("Label du speaker (ex: 'Speaker A')"),
  z.array(z.object({
    nom: z.string().describe("Prénom hypothétique pour ce speaker"),
    raison: z.string().describe("Raison pour laquelle ce prénom est proposé"),
    score: z.number().min(0).max(1).describe("Score de probabilité entre 0 et 1 (1 = très probable)")
  }).describe("Hypothèse pour un speaker")).describe("Liste des hypothèses pour ce speaker")
).describe("Objet associant chaque speaker à la liste de ses hypothèses de prénom");

export const FullSpeakerIdentificationOutputSchema = z.object({
  resolvedSpeakers: SpeakerOutputSchema,
  exclusions: ExclusionsSchema,
  hypotheses: HypothesesSchema
}).describe("Sortie complète de l'identification des speakers, incluant résultats, exclusions et hypothèses");
