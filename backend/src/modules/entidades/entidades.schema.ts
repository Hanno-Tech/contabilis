import { z } from 'zod';

/** CNPJ ou CPF formatado; a Receita já emite CNPJ alfanumérico. */
const DOCUMENTO_RE = /^([A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2})$/;

const texto = z.string().trim().min(1).nullable().optional();

export const TIPOS_ENTIDADE = ['Sindicato', 'Empresa de SST'] as const;

export const entidadeInputSchema = z.object({
  tipo: z.enum(TIPOS_ENTIDADE),
  codigo: texto,
  nome: z.string().trim().min(1, 'Informe o nome'),
  cnpj: z
    .string()
    .trim()
    .regex(DOCUMENTO_RE, 'CNPJ/CPF inválido. Use 00.000.000/0000-00 ou 000.000.000-00')
    .nullable()
    .optional(),
  contato: texto,
  ativo: z.boolean().optional(),
});

export const entidadeUpdateSchema = entidadeInputSchema.extend({
  version: z.number().int().positive(),
});

export type EntidadeInput = z.infer<typeof entidadeInputSchema>;
export type EntidadeUpdate = z.infer<typeof entidadeUpdateSchema>;
