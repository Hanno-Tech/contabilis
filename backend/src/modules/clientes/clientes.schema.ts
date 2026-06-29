import { z } from 'zod';

const text = z.string().nullable().optional();
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD')
  .nullable()
  .optional();
const num = z.number().nullable().optional();

const segurodesempregoSchema = z
  .object({
    usuario: text,
    senha: text,
    email: text,
    email_senha: text,
  })
  .nullable()
  .optional();

const empregadoDomesticoSchema = z
  .object({
    usuario: text,
    senha: text,
  })
  .nullable()
  .optional();

export const clienteInputSchema = z.object({
  // Informações gerais
  codigo: z.number().int().positive('Código deve ser um número positivo'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar no formato 00.000.000/0000-00')
    .nullable()
    .optional(),
  tipo_cliente: text,
  regime_tributacao: text,
  situacao: z.string().min(1).default('Ativa'),
  data_evento_situacao: dateStr,
  responsavel: text,
  // Folha
  possui_folha: text,
  forma_pagamento_salarios: text,
  apura_ponto_escritorio: text,
  realiza_lancamentos: text,
  concede_plano_saude: text,
  plano_operadora: text,
  plano_beneficiarios: text,
  fator_r: text,
  atividade_concomitante: text,
  construcao_civil: text,
  cprb: text,
  observacoes_folha: text,
  prazo_envio_folhas: text,
  // Rotinas
  folha_rotina_automatica: text,
  // Admissão
  prazo_contrato_experiencia: text,
  lancamentos_fixos: text,
  particularidades_cliente: text,
  relatorios_admissao: text,
  // Envio de documentos
  envio_meio: text,
  envio_documento: text,
  envio_contato: text,
  // Sindicato / convenção
  sindicato: text,
  convencao_aplicavel_nome: text,
  convencao_id: z.string().uuid().nullable().optional(),
  // SST
  possui_laudos_sst: text,
  empresa_responsavel_sst: text,
  data_vencimento_laudo: dateStr,
  // Procurações
  venc_procuracao_rfb: dateStr,
  venc_procuracao_det_fgts: dateStr,
  venc_procuracao_econsignado: dateStr,
  emails_notificacao_det: text,
  // INSS autônomo/facultativo
  inss_nit: text,
  inss_codigo_recolhimento: text,
  inss_salario_contribuicao: num,
  inss_aliquota: num,
  // Credenciais sensíveis (cifradas no servidor)
  credenciais: z
    .object({
      seguro_desemprego: segurodesempregoSchema,
      empregado_domestico: empregadoDomesticoSchema,
    })
    .optional(),
});

export type ClienteInput = z.infer<typeof clienteInputSchema>;

export const clienteUpdateSchema = clienteInputSchema.extend({
  version: z.number().int().positive(),
});

export type ClienteUpdate = z.infer<typeof clienteUpdateSchema>;
