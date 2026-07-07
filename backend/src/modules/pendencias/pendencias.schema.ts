import { z } from 'zod';

export const SITUACOES_PENDENCIA = ['Aberta', 'Desconsiderada', 'Resolvida'] as const;

const text = z.string().trim().min(1).nullable().optional();

/**
 * Entrada de uma pendência. A `data` NÃO entra aqui: é sempre gravada pelo
 * servidor com o dia do cadastro (requisito). O usuário que cadastrou também é
 * definido no servidor a partir da sessão.
 */
export const pendenciaInputSchema = z.object({
  cliente_id: z.string().uuid('Cliente inválido'),
  descricao: z.string().trim().min(1, 'Descreva a pendência'),
  situacao: z.enum(SITUACOES_PENDENCIA).default('Aberta'),
  usuario_solucao_id: text,
  usuario_solucao_nome: text,
});

export type PendenciaInput = z.infer<typeof pendenciaInputSchema>;

export const pendenciaUpdateSchema = pendenciaInputSchema.extend({
  version: z.number().int().positive(),
});

export type PendenciaUpdate = z.infer<typeof pendenciaUpdateSchema>;
