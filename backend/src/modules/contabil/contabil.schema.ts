import { z } from 'zod';
import { CAMPOS_CONTABIL, type CampoContabilKey } from './contabil.campos.js';

const text = z.string().trim().nullable().optional();

/**
 * Ficha contábil: todos os campos são texto opcional. Campo ausente do payload
 * não é tocado no UPDATE; `null` explícito limpa.
 */
export const contabilInputSchema = z.object(
  Object.fromEntries(CAMPOS_CONTABIL.map((c) => [c.key, text])) as Record<
    CampoContabilKey,
    typeof text
  >,
);

export type ContabilInput = z.infer<typeof contabilInputSchema>;

export const contabilUpdateSchema = contabilInputSchema.extend({
  version: z.number().int().positive(),
});

export type ContabilUpdate = z.infer<typeof contabilUpdateSchema>;
