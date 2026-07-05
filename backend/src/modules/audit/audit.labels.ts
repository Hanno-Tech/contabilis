/**
 * Mapas campo → rótulo legível para a trilha de auditoria.
 * A ordem aqui define a ordem em que as mudanças aparecem na tela.
 */

/** Clientes (tabela `clientes`). */
export const CLIENTE_GERAL_LABELS: Record<string, string> = {
  codigo: 'Código',
  nome: 'Razão social',
  cnpj: 'CNPJ',
  tipo_cliente: 'Tipo de cliente',
  regime_tributacao: 'Regime de tributação',
  situacao: 'Situação',
  data_evento_situacao: 'Data da situação',
  responsavel: 'Responsável',
};

/** Dados de folha em diante (tabela `cliente_folha`). */
export const CLIENTE_FOLHA_LABELS: Record<string, string> = {
  // Folha
  possui_folha: 'Possui folha',
  forma_pagamento_salarios: 'Forma de pagamento dos salários',
  apura_ponto_escritorio: 'Apura ponto no escritório',
  realiza_lancamentos: 'Realiza lançamentos',
  concede_plano_saude: 'Concede plano de saúde',
  plano_operadora: 'Operadora do plano',
  plano_beneficiarios: 'Beneficiários do plano',
  fator_r: 'Fator R',
  atividade_concomitante: 'Atividade concomitante',
  construcao_civil: 'Construção civil',
  cprb: 'CPRB',
  encargos_recolhidos_escritorio: 'Encargos recolhidos pelo escritório',
  observacoes_folha: 'Observações da folha',
  prazo_envio_folhas: 'Prazo de envio das folhas',
  inss_retido_nf: 'INSS retido na NF',
  // Fechamento / rotinas
  folha_rotina_automatica: 'Rotina automática da folha',
  responsavel_fechamento_folha: 'Responsável pelo fechamento da folha',
  codigo_rotina_automatica: 'Código da rotina automática',
  data_meta_entrega_folha: 'Meta de entrega da folha',
  // Admissão
  prazo_contrato_experiencia: 'Prazo do contrato de experiência',
  lancamentos_fixos: 'Lançamentos fixos',
  particularidades_cliente: 'Especificidades do cliente',
  relatorios_admissao: 'Relatórios de admissão',
  cargos_insalubres_perigosos: 'Cargos insalubres ou perigosos',
  // Envio de documentos
  envio_meio: 'Forma de envio dos documentos',
  envio_documento: 'Documento de envio',
  envio_contato: 'Contato de envio',
  envio_observacoes: 'Observações do envio',
  // Sindicato / convenção
  sindicato: 'Sindicato',
  convencao_aplicavel_nome: 'Convenção aplicável (nome)',
  convencao_apelido: 'Convenção vinculada',
  // SST
  possui_laudos_sst: 'Possui laudos SST',
  empresa_responsavel_sst: 'Empresa responsável SST',
  data_vencimento_laudo: 'Vencimento do laudo',
  termo_ciencia_sst: 'Termo de ciência (ausência de laudos)',
  // Procurações
  venc_procuracao_rfb: 'Vencimento procuração RFB',
  venc_procuracao_det: 'Vencimento procuração DET',
  venc_procuracao_fgts: 'Vencimento procuração FGTS Digital',
  venc_procuracao_econsignado: 'Vencimento procuração e-Consignado',
  emails_notificacao_det: 'E-mails de notificação DET',
  // INSS
  inss_tipo_segurado: 'INSS — Tipo de segurado',
  inss_nit: 'INSS — NIT',
  inss_codigo_recolhimento: 'INSS — Código de recolhimento',
  inss_salario_contribuicao: 'INSS — Salário de contribuição',
  inss_aliquota: 'INSS — Alíquota',
};

export const OCORRENCIA_LABELS: Record<string, string> = {
  cliente_nome: 'Cliente',
  data: 'Data',
  ocorrencia: 'Ocorrência',
  resolucao: 'Resolução / observação',
  situacao: 'Situação',
  responsavel_nome: 'Responsável',
};

export const CONVENCAO_LABELS: Record<string, string> = {
  apelido: 'Apelido',
  sindicato_patronal: 'Sindicato patronal',
  sindicato_laboral: 'Sindicato laboral',
  situacao: 'Situação',
  vigencia_inicio: 'Início da vigência',
  vigencia_fim: 'Fim da vigência',
  data_expiracao: 'Data de expiração',
  adicional_noturno: 'Adicional noturno',
  he_dias_normais: 'Hora extra — dias normais',
  he_domingos_feriados: 'Hora extra — domingos/feriados',
  he_observacoes: 'Hora extra — observações',
  contatos_sindicato: 'Contatos do sindicato',
};
