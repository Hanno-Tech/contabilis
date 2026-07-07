import { z } from 'zod';

const text = z.string().nullable().optional();
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD')
  .nullable()
  .optional();
const num = z.number().nullable().optional();

// ------------------------------------------------- Clientes (clientes)

export const clienteInputSchema = z.object({
  codigo: z.number().int().positive('Código deve ser um número positivo'),
  nome: z.string().min(1, 'Razão social é obrigatória'),
  // Aceita CPF (000.000.000-00), CNPJ numérico e CNPJ alfanumérico
  // (regra da Receita Federal — 12 posições alfanuméricas + 2 dígitos verificadores).
  cnpj: z
    .string()
    .regex(
      /^(\d{3}\.\d{3}\.\d{3}-\d{2}|[A-Za-z0-9]{2}\.[A-Za-z0-9]{3}\.[A-Za-z0-9]{3}\/[A-Za-z0-9]{4}-\d{2})$/,
      'Informe um CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) válido',
    )
    .nullable()
    .optional(),
  tipo_cliente: text,
  regime_tributacao: text,
  situacao: z.string().min(1).default('Ativa'),
  data_evento_situacao: dateStr,
  responsavel: text,
});

export type ClienteInput = z.infer<typeof clienteInputSchema>;

export const clienteUpdateSchema = clienteInputSchema.extend({
  version: z.number().int().positive(),
});

export type ClienteUpdate = z.infer<typeof clienteUpdateSchema>;

// ----------------------------------------------- Dados de folha (cliente_folha)

// SENHAS: uma credencial por órgão (Link de acesso, usuário, senha).
const orgaoCredSchema = z.object({
  id: z.string().uuid().optional(),
  tipo: z.string().trim().min(1),
  link: text,
  usuario: text,
  senha: text,
});

const empregadoDomesticoSchema = z
  .object({
    usuario: text,
    senha: text,
  })
  .nullable()
  .optional();

// INFORMAÇÕES SINDICAIS: a empresa pode ter vários sindicatos/convenções.
const sindicatoSchema = z.object({
  sindicato: text,
  convencao_aplicavel_nome: text,
  situacao_convencao: text,
  recolhe_contribuicao: text,
});

export const folhaInputSchema = z.object({
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
  encargos_recolhidos_escritorio: text,
  observacoes_folha: text,
  prazo_envio_folhas: text,
  // Tributárias
  inss_retido_nf: text,
  // Fechamento / rotinas
  folha_rotina_automatica: text,
  responsavel_fechamento_folha: text,
  codigo_rotina_automatica: text,
  data_meta_entrega_folha: text,
  // Admissão
  prazo_contrato_experiencia: text,
  lancamentos_fixos: text,
  particularidades_cliente: text,
  relatorios_admissao: text,
  cargos_insalubres_perigosos: text,
  // Envio de documentos
  envio_meio: text,
  envio_documento: text,
  envio_contato: text,
  envio_observacoes: text,
  // SST
  possui_laudos_sst: text,
  empresa_responsavel_sst: text,
  data_vencimento_laudo: dateStr,
  termo_ciencia_sst: text,
  // Procurações
  venc_procuracao_rfb: dateStr,
  venc_procuracao_det: dateStr,
  venc_procuracao_fgts: dateStr,
  venc_procuracao_econsignado: dateStr,
  emails_notificacao_det: text,
  // INSS autônomo/facultativo
  inss_tipo_segurado: text,
  inss_nit: text,
  inss_codigo_recolhimento: text,
  inss_salario_contribuicao: num,
  inss_aliquota: num,
  // Sindicatos / convenções (lista)
  sindicatos: z.array(sindicatoSchema).optional(),
  // Credenciais sensíveis (cifradas no servidor)
  credenciais: z
    .object({
      orgaos: z.array(orgaoCredSchema).optional(),
      empregado_domestico: empregadoDomesticoSchema,
    })
    .optional(),
});

export type FolhaInput = z.infer<typeof folhaInputSchema>;

export const folhaUpdateSchema = folhaInputSchema.extend({
  version: z.number().int().positive(),
});

export type FolhaUpdate = z.infer<typeof folhaUpdateSchema>;
