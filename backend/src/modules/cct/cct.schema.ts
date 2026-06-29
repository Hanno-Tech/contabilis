import { z } from 'zod';

/** Data 'YYYY-MM-DD' (ou null). */
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD')
  .nullable()
  .optional();

const num = z.number().nullable().optional();

const pisoSchema = z.object({
  funcao: z.string().min(1),
  valor: num,
});

const regraSchema = z.object({
  categoria: z.string().min(1),
  titulo: z.string().nullable().optional(),
  conteudo: z.string().min(1),
});

export const cctInputSchema = z.object({
  apelido: z.string().min(1, 'Apelido é obrigatório'),
  sindicato_patronal: z.string().nullable().optional(),
  sindicato_laboral: z.string().nullable().optional(),
  situacao: z.string().min(1).default('Vigente'),
  vigencia_inicio: dateStr,
  vigencia_fim: dateStr,
  data_expiracao: dateStr,
  adicional_noturno: num,
  he_dias_normais: num,
  he_domingos_feriados: num,
  he_observacoes: z.string().nullable().optional(),
  contatos_sindicato: z.string().nullable().optional(),
  pisos: z.array(pisoSchema).default([]),
  regras: z.array(regraSchema).default([]),
});

export type CctInput = z.infer<typeof cctInputSchema>;

/** Update exige a versão carregada (locking otimista — RNF-01). */
export const cctUpdateSchema = cctInputSchema.extend({
  version: z.number().int().positive(),
});

export type CctUpdate = z.infer<typeof cctUpdateSchema>;
