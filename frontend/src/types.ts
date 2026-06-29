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
  entidade: 'cliente' | 'convencao';
  entidade_id: string;
  entidade_label: string | null;
  acao: 'criou' | 'editou';
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
  situacao: string;
  responsavel: string | null;
  regime_tributacao: string | null;
  convencao_apelido: string | null;
}

export interface CredencialMascarada {
  tipo: string;
  usuario: string | null;
  email: string | null;
  tem_senha: boolean;
  tem_email_senha: boolean;
}

export interface CredencialRevelada {
  tipo: string;
  usuario: string | null;
  email: string | null;
  senha: string | null;
  email_senha: string | null;
}

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
  folha_rotina_automatica: string | null;
  prazo_contrato_experiencia: string | null;
  lancamentos_fixos: string | null;
  particularidades_cliente: string | null;
  relatorios_admissao: string | null;
  envio_meio: string | null;
  envio_documento: string | null;
  envio_contato: string | null;
  sindicato: string | null;
  convencao_aplicavel_nome: string | null;
  convencao_id: string | null;
  convencao_apelido: string | null;
  possui_laudos_sst: string | null;
  empresa_responsavel_sst: string | null;
  data_vencimento_laudo: string | null;
  venc_procuracao_rfb: string | null;
  venc_procuracao_det_fgts: string | null;
  venc_procuracao_econsignado: string | null;
  emails_notificacao_det: string | null;
  inss_nit: string | null;
  inss_codigo_recolhimento: string | null;
  inss_salario_contribuicao: string | null;
  inss_aliquota: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  credenciais: CredencialMascarada[];
}

export interface Filtros {
  situacoes: string[];
  responsaveis: string[];
  regimes: string[];
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
