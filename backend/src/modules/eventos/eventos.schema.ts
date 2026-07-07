import { z } from 'zod';

export const SITUACOES_EVENTO = ['A lançar', 'Lançado', 'Cancelado'] as const;

const text = z.string().trim().min(1).nullable().optional();

/**
 * Entrada de um evento futuro. A `competencia` chega como 'AAAA-MM' (mês de
 * lançamento) e é normalizada para o 1º dia do mês no repositório. O usuário
 * que lançou é definido no servidor a partir da sessão.
 */
export const eventoInputSchema = z.object({
  cliente_id: z.string().uuid('Cliente inválido'),
  competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Competência deve estar no formato AAAA-MM'),
  colaborador_nome: text,
  descricao: text,
  situacao: z.enum(SITUACOES_EVENTO).default('A lançar'),
});

export type EventoInput = z.infer<typeof eventoInputSchema>;

export const eventoUpdateSchema = eventoInputSchema.extend({
  version: z.number().int().positive(),
});

export type EventoUpdate = z.infer<typeof eventoUpdateSchema>;
