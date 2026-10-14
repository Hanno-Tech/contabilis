import { z } from 'zod';
import { CAMPOS_IMOVEL, CAMPOS_IMOVEL_NUMERICOS } from '../contabil/contabil.campos.js';

export const SITUACOES_IMOVEL = [
  'Ativo',
  'Vendido',
  'Transformado em Empreendimento Imobiliário',
  'Permutado',
  'Utilizado para Liquidação de Quotas',
  'Devolvido ao Sócio por Redução de Capital Social',
] as const;

const text = z.string().trim().nullable().optional();
const money = z.number().nonnegative('Valor não pode ser negativo').nullable().optional();

const campos = Object.fromEntries(
  CAMPOS_IMOVEL.filter((c) => c.key !== 'situacao').map((c) => [
    c.key,
    CAMPOS_IMOVEL_NUMERICOS.has(c.key) ? money : text,
  ]),
) as Record<string, typeof text | typeof money>;

/**
 * Imóvel de um cliente. O número de ordem é sequencial por cliente: em branco
 * na criação, o servidor usa o próximo livre.
 */
export const imovelInputSchema = z.object({
  cliente_id: z.string().uuid('Cliente inválido'),
  numero_ordem: z.number().int().positive('Número de ordem deve ser positivo').nullable().optional(),
  situacao: z.enum(SITUACOES_IMOVEL).default('Ativo'),
  ...campos,
});

export type ImovelInput = z.infer<typeof imovelInputSchema> & Record<string, unknown>;

export const imovelUpdateSchema = imovelInputSchema.extend({
  version: z.number().int().positive(),
});

export type ImovelUpdate = ImovelInput & { version: number };
