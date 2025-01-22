import { z } from 'zod';
import { getSchemaDescription, zodSchemaToJsonExample } from '../utils/zod-schema.utils';

describe('Zod Schema Utils', () => {
    describe('zodSchemaToJsonExample', () => {
        it('should generate JSON example from a complex schema with descriptions', () => {
            const schema = z.object({
                user: z.object({
                    name: z.string().describe("le nom de l'utilisateur"),
                    age: z.number().describe("l'âge de l'utilisateur"),
                    isActive: z.boolean().describe("si l'utilisateur est actif"),
                    tags: z.array(z.string().describe("un tag"))
                }),
                settings: z.array(z.object({
                    key: z.string().describe("la clé du paramètre"),
                    value: z.string().describe("la valeur du paramètre")
                }))
            });

            const result = JSON.parse(zodSchemaToJsonExample(schema));
            
            expect(result).toEqual({
                user: {
                    name: "le nom de l'utilisateur",
                    age: "unknown type", // number n'est pas encore géré
                    isActive: "si l'utilisateur est actif",
                    tags: ["un tag"]
                },
                settings: [{
                    key: "la clé du paramètre",
                    value: "la valeur du paramètre"
                }]
            });
        });
    });

    describe('getSchemaDescription', () => {
        it('should generate a text description from a complex schema', () => {
            const schema = z.object({
                user: z.object({
                    name: z.string().describe("le nom complet"),
                    role: z.string().describe("le rôle dans l'équipe")
                }),
                active: z.boolean().describe("statut d'activité")
            });

            const result = getSchemaDescription(schema);
            
            expect(result).toBe(
                "user: name: le nom complet\n" +
                "role: le rôle dans l'équipe\n" +
                "active: statut d'activité"
            );
        });
    });
});
