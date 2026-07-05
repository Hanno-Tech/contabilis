import type { ColumnType, Generated } from 'kysely';

/**
 * Tipos do esquema do banco usados pelo Kysely.
 * Mantidos manualmente em sincronia com as migrations em `migrations/`.
 *
 * Convenções:
 * - `Generated<T>`  : valor gerado pelo banco (default/serial) — opcional no insert.
 * - `ColumnType<S,I,U>`: tipo na leitura (S), no insert (I) e no update (U).
 */

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
// Datas "puras" (sem hora) trafegam como string ISO 'YYYY-MM-DD'.
type DateOnly = ColumnType<string, string | Date, string | Date>;

export interface ConvencoesTable {
  id: Generated<string>;
  apelido: string;
  sindicato_patronal: string | null;
  sindicato_laboral: string | null;
  situacao: string; // 'Vigente' | 'Expirada' | ...
  vigencia_inicio: DateOnly | null;
  vigencia_fim: DateOnly | null;
  data_expiracao: DateOnly | null;
  adicional_noturno: string | null; // numeric -> string no pg driver
  he_dias_normais: string | null;
  he_domingos_feriados: string | null;
  he_observacoes: string | null;
  contatos_sindicato: string | null;
  version: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface ConvencaoPisosTable {
  id: Generated<string>;
  convencao_id: string;
  funcao: string;
  valor: string | null; // numeric
  ordem: Generated<number>;
}

export interface ConvencaoRegrasTable {
  id: Generated<string>;
  convencao_id: string;
  categoria: string; // ex.: 'BANCO DE HORAS', 'AVISO PRÉVIO'
  titulo: string | null; // subitem (ex.: 'Demais empregados')
  conteudo: string;
  ordem: Generated<number>;
}

/**
 * Cliente — apenas as informações gerais (identidade). É a tabela central
 * referenciada pelos demais módulos. Os dados operacionais ficam em
 * `cliente_folha` (relação 1:1).
 */
export interface ClientesTable {
  id: Generated<string>;
  codigo: number;
  nome: string;
  cnpj: string | null;
  tipo_cliente: string | null;
  regime_tributacao: string | null;
  situacao: string;
  data_evento_situacao: DateOnly | null;
  responsavel: string | null;
  version: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

/**
 * Dados operacionais do cliente ("da folha em diante"), 1:1 com `clientes`.
 * Editados na tela "Informações Gerais".
 */
export interface ClienteFolhaTable {
  id: Generated<string>;
  cliente_id: string;
  // Folha de pagamento
  possui_folha: string | null;
  forma_pagamento_salarios: string | null;
  apura_ponto_escritorio: string | null;
  realiza_lancamentos: string | null;
  concede_plano_saude: string | null;
  plano_operadora: string | null;
  plano_beneficiarios: string | null;
  fator_r: string | null;
  atividade_concomitante: string | null;
  construcao_civil: string | null;
  cprb: string | null;
  encargos_recolhidos_escritorio: string | null;
  observacoes_folha: string | null;
  prazo_envio_folhas: string | null;
  // Tributárias
  inss_retido_nf: string | null;
  // Rotinas automáticas / fechamento
  folha_rotina_automatica: string | null;
  responsavel_fechamento_folha: string | null;
  codigo_rotina_automatica: string | null;
  data_meta_entrega_folha: string | null;
  // Admissão
  prazo_contrato_experiencia: string | null;
  lancamentos_fixos: string | null;
  particularidades_cliente: string | null;
  relatorios_admissao: string | null;
  cargos_insalubres_perigosos: string | null;
  // Envio de documentos
  envio_meio: string | null;
  envio_documento: string | null;
  envio_contato: string | null;
  envio_observacoes: string | null;
  // Sindicato / convenção (legado; fonte principal em cliente_sindicatos)
  sindicato: string | null;
  convencao_aplicavel_nome: string | null;
  convencao_id: string | null;
  // SST
  possui_laudos_sst: string | null;
  empresa_responsavel_sst: string | null;
  data_vencimento_laudo: DateOnly | null;
  termo_ciencia_sst: string | null;
  // Procurações
  venc_procuracao_rfb: DateOnly | null;
  venc_procuracao_det_fgts: DateOnly | null;
  venc_procuracao_det: DateOnly | null;
  venc_procuracao_fgts: DateOnly | null;
  venc_procuracao_econsignado: DateOnly | null;
  emails_notificacao_det: string | null;
  // INSS autônomo/facultativo
  inss_tipo_segurado: string | null;
  inss_nit: string | null;
  inss_codigo_recolhimento: string | null;
  inss_salario_contribuicao: string | null;
  inss_aliquota: string | null;
  // Controle
  version: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

/**
 * Credenciais sensíveis isoladas em tabela própria.
 * As senhas são armazenadas cifradas (AES-256-GCM) na coluna `*_cipher`.
 */
export interface ClienteCredenciaisTable {
  id: Generated<string>;
  cliente_id: string;
  tipo: string; // órgão (ex.: 'seguro_desemprego', 'empregado_domestico', ou nome livre)
  link: string | null;
  usuario: string | null;
  senha_cipher: string | null;
  email: string | null;
  email_senha_cipher: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

/** Sindicatos / convenções do cliente (vários por cliente). */
export interface ClienteSindicatosTable {
  id: Generated<string>;
  cliente_id: string;
  sindicato: string | null;
  convencao_id: string | null;
  convencao_aplicavel_nome: string | null;
  situacao_convencao: string | null; // 'Vigente' | 'Vencida' | 'Não se aplica'
  recolhe_contribuicao: string | null; // 'Sim' | 'Não' | 'Não se aplica'
  ordem: Generated<number>;
}

/** Uma mudança individual de campo dentro de um evento de auditoria. */
export interface FieldChange {
  campo: string;
  rotulo: string;
  de: string | null;
  para: string | null;
}

/**
 * Trilha de auditoria — um registro por evento (criação/edição).
 * `alteracoes` é jsonb: na leitura volta como objeto; na escrita gravamos a
 * string JSON (o driver pg cuida do cast para jsonb).
 */
export interface AlteracoesTable {
  id: Generated<string>;
  entidade: string; // 'cliente' | 'convencao'
  entidade_id: string;
  entidade_label: string | null;
  acao: string; // 'criou' | 'editou'
  usuario_id: string | null;
  usuario_nome: string | null;
  alteracoes: ColumnType<FieldChange[], string, string>;
  created_at: Generated<Timestamp>;
}

/**
 * Ocorrências vinculadas a um cliente — o que aconteceu, a resolução/observação,
 * a situação e qual usuário lidou com o registro.
 */
export interface OcorrenciasTable {
  id: Generated<string>;
  cliente_id: string;
  data: DateOnly;
  ocorrencia: string;
  resolucao: string | null;
  situacao: string; // 'Resolvido' | 'Não resolvido' | 'Em análise'
  responsavel_id: string | null;
  responsavel_nome: string | null;
  version: Generated<number>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface Database {
  convencoes: ConvencoesTable;
  convencao_pisos: ConvencaoPisosTable;
  convencao_regras: ConvencaoRegrasTable;
  clientes: ClientesTable;
  cliente_folha: ClienteFolhaTable;
  cliente_credenciais: ClienteCredenciaisTable;
  cliente_sindicatos: ClienteSindicatosTable;
  alteracoes: AlteracoesTable;
  ocorrencias: OcorrenciasTable;
}
