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

export interface ClientesTable {
  id: Generated<string>;
  // Informações gerais
  codigo: number;
  nome: string;
  cnpj: string | null;
  tipo_cliente: string | null;
  regime_tributacao: string | null;
  situacao: string;
  data_evento_situacao: DateOnly | null;
  responsavel: string | null;
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
  observacoes_folha: string | null;
  prazo_envio_folhas: string | null;
  // Rotinas automáticas
  folha_rotina_automatica: string | null;
  // Admissão
  prazo_contrato_experiencia: string | null;
  lancamentos_fixos: string | null;
  particularidades_cliente: string | null;
  relatorios_admissao: string | null;
  // Envio de documentos
  envio_meio: string | null;
  envio_documento: string | null;
  envio_contato: string | null;
  // Sindicato / convenção
  sindicato: string | null;
  convencao_aplicavel_nome: string | null;
  convencao_id: string | null;
  // SST
  possui_laudos_sst: string | null;
  empresa_responsavel_sst: string | null;
  data_vencimento_laudo: DateOnly | null;
  // Procurações
  venc_procuracao_rfb: DateOnly | null;
  venc_procuracao_det_fgts: DateOnly | null;
  venc_procuracao_econsignado: DateOnly | null;
  emails_notificacao_det: string | null;
  // INSS autônomo/facultativo
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
  tipo: string; // 'seguro_desemprego' | 'empregado_domestico'
  usuario: string | null;
  senha_cipher: string | null;
  email: string | null;
  email_senha_cipher: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
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

export interface Database {
  convencoes: ConvencoesTable;
  convencao_pisos: ConvencaoPisosTable;
  convencao_regras: ConvencaoRegrasTable;
  clientes: ClientesTable;
  cliente_credenciais: ClienteCredenciaisTable;
  alteracoes: AlteracoesTable;
}
