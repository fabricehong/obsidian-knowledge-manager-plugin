import { z } from 'zod';

export const ReplacementSpecSchema = z.object({
    target: z.string().min(1, 'Target must not be empty'),
    toSearch: z.array(z.string().min(1, 'Search terms must not be empty'))
        .min(1, 'Must have at least one search term')
});

export type ReplacementSpec = z.infer<typeof ReplacementSpecSchema>;

export const ReplacementSpecsSchema = z.object({
    category: z.string().min(1, 'Category must not be empty'),
    replacements: z.array(ReplacementSpecSchema)
});

export type ReplacementSpecs = z.infer<typeof ReplacementSpecsSchema>;

export const VocabularySpecSchema = z.object({
    category: z.string().min(1, 'Category must not be empty'),
    vocabulary: z.array(z.string().min(1, 'Vocabulary term must not be empty'))
        .min(1, 'Must have at least one vocabulary term')
});

export type VocabularySpecs = z.infer<typeof VocabularySpecSchema>;