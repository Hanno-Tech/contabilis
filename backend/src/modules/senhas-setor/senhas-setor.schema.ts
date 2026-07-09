import { z } from 'zod';

const text = z.string().trim().min(1).nullable().optional();

/**
 * Entrada de uma senha do setor. `senha` é opcional: em branco na edição,
 * mantém a senha atual (não é reescrita). O nome/sistema é obrigatório.
 */
export const senhaSetorInputSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do sistema/serviço'),
  link: text,
  usuario: text,
  senha: text,
  observacoes: text,
});

export type SenhaSetorInput = z.infer<typeof senhaSetorInputSchema>;

export const senhaSetorUpdateSchema = senhaSetorInputSchema.extend({
  version: z.number().int().positive(),
});

export type SenhaSetorUpdate = z.infer<typeof senhaSetorUpdateSchema>;
