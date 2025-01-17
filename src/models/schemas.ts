import { z } from 'zod';

export const ReplacementSpecSchema = z.object({
    category: z.string().min(1, 'Category must not be empty'),
    replacements: z.array(
        z.object({
            target: z.string().min(1, 'Target must not be empty'),
            toSearch: z.array(z.string().min(1, 'Search terms must not be empty'))
                .min(1, 'Must have at least one search term')
        })
    )
});

export type ReplacementSpecs = z.infer<typeof ReplacementSpecSchema>;
