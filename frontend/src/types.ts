export interface SessionUser {
  id: string;
  username: string;
  name: string;
}

export interface FieldChange {
  campo: string;
  rotulo: string;
  de: string | null;
  para: string | null;
}

export interface Vencimento {
  categoria: 'procuracao' | 'laudo' | 'convencao';
  tipo: string;
  data: string;
  dias: number;
  registro_id: string;
  registro_codigo: number | null;
  registro_nome: string;
  destino: 'cliente' | 'convencao';
}

export interface Dashboard {
  kpis: {
    clientes_total: number;
    clientes_ativos: number;
    clientes_sem_convencao: number;
    convencoes_total: number;
    convencoes_vigentes: number;
    convencoes_expiradas: number;
    vencimentos_vencidos: number;
    vencimentos_30: number;
  };
  vencimentos: Vencimento[];
  composicao: {
    por_responsavel: { label: string; total: number }[];
    por_regime: { label: string; total: number }[];
    por_situacao: { label: string; total: number }[];
    top_convencoes: { label: string; total: number }[];
  };
  atividade: {
    ultimos_7: number;
    ultimos_30: number;
    recentes: Alteracao[];
  };
}

export interface Alteracao {
  id: string;
  entidade: 'cliente' | 'convencao' | 'ocorrencia';
  entidade_id: string;
  entidade_label: string | null;
  acao: 'criou' | 'editou' | 'excluiu';
  usuario_id: string | null;
  usuario_nome: string | null;
  alteracoes: FieldChange[];
  created_at: string;
}

export interface ClienteListItem {
  id: string;
  codigo: number;
  nome: string;
  cnpj: string | null;
  tipo_cliente: string | null;
  situacao: string;
  data_evento_situacao: string | null;
  responsavel: string | null;
  regime_tributacao: string | null;
  convencao_apelido: string | null;
}

export interface CredencialMascarada {
  id: string;
  tipo: string;
  link: string | null;
  usuario: string | null;
  email: string | null;
  tem_senha: boolean;
  tem_email_senha: boolean;
}

export interface CredencialRevelada {
  id: string;
  tipo: string;
  link: string | null;
  usuario: string | null;
  email: string | null;
  senha: string | null;
  email_senha: string | null;
}

export interface ClienteSindicato {
  id?: string;
  sindicato: string | null;
  convencao_id: string | null;
  convencao_aplicavel_nome: string | null;
  situacao_convencao: string | null;
  recolhe_contribuicao: string | null;
  ordem?: number;
  convencao_apelido?: string | null;
  convencao_situacao?: string | null;
}

/** Clientes do cliente (tabela `clientes`). */
export interface Cliente {
  id: string;
  codigo: number;
  nome: string;
  cnpj: string | null;
  tipo_cliente: string | null;
  regime_tributacao: string | null;
  situacao: string;
  data_evento_situacao: string | null;
  responsavel: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

/** Dados de folha em diante (tabela `cliente_folha`). */
export interface ClienteFolha {
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
  inss_retido_nf: string | null;
  folha_rotina_automatica: string | null;
  responsavel_fechamento_folha: string | null;
  codigo_rotina_automatica: string | null;
  data_meta_entrega_folha: string | null;
  prazo_contrato_experiencia: string | null;
  lancamentos_fixos: string | null;
  particularidades_cliente: string | null;
  relatorios_admissao: string | null;
  cargos_insalubres_perigosos: string | null;
  envio_meio: string | null;
  envio_documento: string | null;
  envio_contato: string | null;
  envio_observacoes: string | null;
  sindicato: string | null;
  convencao_aplicavel_nome: string | null;
  convencao_id: string | null;
  convencao_apelido: string | null;
  possui_laudos_sst: string | null;
  empresa_responsavel_sst: string | null;
  data_vencimento_laudo: string | null;
  termo_ciencia_sst: string | null;
  venc_procuracao_rfb: string | null;
  venc_procuracao_det_fgts: string | null;
  venc_procuracao_det: string | null;
  venc_procuracao_fgts: string | null;
  venc_procuracao_econsignado: string | null;
  emails_notificacao_det: string | null;
  inss_tipo_segurado: string | null;
  inss_nit: string | null;
  inss_codigo_recolhimento: string | null;
  inss_salario_contribuicao: string | null;
  inss_aliquota: string | null;
  version: number;
}

/** Ficha completa (geral + folha + sindicatos + credenciais) — tela "Visão geral". */
export interface ClienteFicha extends Cliente {
  folha: ClienteFolha | null;
  sindicatos: ClienteSindicato[];
  credenciais: CredencialMascarada[];
}

export interface Filtros {
  situacoes: string[];
  responsaveis: string[];
  regimes: string[];
}

export interface Usuario {
  id: string;
  nome: string;
}

export interface OcorrenciaOpcoes {
  usuarios: Usuario[];
  situacoes: string[];
}

export interface Ocorrencia {
  id: string;
  cliente_id: string;
  data: string;
  ocorrencia: string;
  resolucao: string | null;
  situacao: string;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  cliente_codigo: number;
  cliente_nome: string;
}

export interface CctListItem {
  id: string;
  apelido: string;
  sindicato_patronal: string | null;
  sindicato_laboral: string | null;
  situacao: string;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  data_expiracao: string | null;
  version: number;
}

export interface Piso {
  id?: string;
  funcao: string;
  valor: string | null;
  ordem?: number;
}

export interface Regra {
  id?: string;
  categoria: string;
  titulo: string | null;
  conteudo: string;
  ordem?: number;
}

export interface Cct {
  id: string;
  apelido: string;
  sindicato_patronal: string | null;
  sindicato_laboral: string | null;
  situacao: string;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  data_expiracao: string | null;
  adicional_noturno: string | null;
  he_dias_normais: string | null;
  he_domingos_feriados: string | null;
  he_observacoes: string | null;
  contatos_sindicato: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  pisos: Piso[];
  regras: Regra[];
}
