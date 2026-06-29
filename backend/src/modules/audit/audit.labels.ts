/**
 * Mapas campo → rótulo legível para a trilha de auditoria.
 * A ordem aqui define a ordem em que as mudanças aparecem na tela.
 */

export const CLIENTE_LABELS: Record<string, string> = {
  // Informações gerais
  codigo: 'Código',
  nome: 'Nome',
  cnpj: 'CNPJ',
  tipo_cliente: 'Tipo de cliente',
  regime_tributacao: 'Regime de tributação',
  situacao: 'Situação',
  data_evento_situacao: 'Data do evento de situação',
  responsavel: 'Responsável',
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
  observacoes_folha: 'Observações da folha',
  prazo_envio_folhas: 'Prazo de envio das folhas',
  // Rotinas
  folha_rotina_automatica: 'Rotina automática da folha',
  // Admissão
  prazo_contrato_experiencia: 'Prazo do contrato de experiência',
  lancamentos_fixos: 'Lançamentos fixos',
  particularidades_cliente: 'Particularidades do cliente',
  relatorios_admissao: 'Relatórios de admissão',
  // Envio de documentos
  envio_meio: 'Meio de envio',
  envio_documento: 'Documento de envio',
  envio_contato: 'Contato de envio',
  // Sindicato / convenção
  sindicato: 'Sindicato',
  convencao_aplicavel_nome: 'Convenção aplicável (nome)',
  convencao_apelido: 'Convenção vinculada',
  // SST
  possui_laudos_sst: 'Possui laudos SST',
  empresa_responsavel_sst: 'Empresa responsável SST',
  data_vencimento_laudo: 'Vencimento do laudo',
  // Procurações
  venc_procuracao_rfb: 'Vencimento procuração RFB',
  venc_procuracao_det_fgts: 'Vencimento procuração DET/FGTS',
  venc_procuracao_econsignado: 'Vencimento procuração e-Consignado',
  emails_notificacao_det: 'E-mails de notificação DET',
  // INSS
  inss_nit: 'INSS — NIT',
  inss_codigo_recolhimento: 'INSS — Código de recolhimento',
  inss_salario_contribuicao: 'INSS — Salário de contribuição',
  inss_aliquota: 'INSS — Alíquota',
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
