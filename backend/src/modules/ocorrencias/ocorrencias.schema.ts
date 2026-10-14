import { z } from 'zod';
import { setorSchema } from '../../lib/setor.js';

export const SITUACOES_OCORRENCIA = ['Resolvido', 'Não resolvido', 'Em análise'] as const;

const text = z.string().trim().min(1).nullable().optional();
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD');

export const ocorrenciaInputSchema = z.object({
  // Setor dono do registro — só vale na criação; a edição não troca de setor.
  setor: setorSchema,
  cliente_id: z.string().uuid('Cliente inválido'),
  data: dateStr,
  ocorrencia: z.string().trim().min(1, 'Descreva o que aconteceu'),
  porque: text,
  resolucao: text,
  situacao: z.enum(SITUACOES_OCORRENCIA).default('Em análise'),
  responsavel_id: text,
  responsavel_nome: text,
});

export type OcorrenciaInput = z.infer<typeof ocorrenciaInputSchema>;

export const ocorrenciaUpdateSchema = ocorrenciaInputSchema.extend({
  version: z.number().int().positive(),
});

export type OcorrenciaUpdate = z.infer<typeof ocorrenciaUpdateSchema>;
