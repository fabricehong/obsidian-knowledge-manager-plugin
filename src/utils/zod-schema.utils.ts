import { z } from "zod";

export function zodSchemaToJsonExample(schema: z.ZodType): string {
    // Fonction récursive pour parcourir le schéma
    function processSchema(schema: z.ZodType): any {
        if (schema instanceof z.ZodObject) {
            const shape = schema._def.shape();
            const result: any = {};
            for (const [key, value] of Object.entries(shape)) {
                result[key] = processSchema(value as z.ZodType);
            }
            return result;
        }
        else if (schema instanceof z.ZodArray) {
            return [processSchema(schema.element)];
        }
        else if (schema instanceof z.ZodString) {
            return schema.description || "string value";
        }
        else if (schema instanceof z.ZodBoolean) {
            return schema.description || false;
        }
        // Ajouter d'autres types si nécessaire
        return "unknown type";
    }

    return JSON.stringify(processSchema(schema), null, 2);
}

export function getSchemaDescription(schema: z.ZodType): string {
    const def = (schema as any)._def;
    if (def.description) {
        return def.description;
    }
    if (def.typeName === 'ZodObject') {
        const shape = def.shape();
        return Object.entries(shape)
            .map(([key, value]) => `${key}: ${getSchemaDescription(value as z.ZodType)}`)
            .join('\n');
    }
    return def.typeName.replace('Zod', '').toLowerCase();
}
