/**
 * Catálogo dos campos escalares da ficha do cliente: quadro, rótulo, tipo de
 * entrada e opções.
 *
 * Fonte única de APRESENTAÇÃO, consumida pelo formulário de edição
 * (`ClienteFormPage`) e pela tela de visualização (`ClienteDetailPage`). Antes
 * cada tela tinha a sua própria cópia, e elas divergiram: a visualização ficou
 * mostrando campos já removidos e escondendo a procuração DET/FGTS de 387
 * clientes.
 *
 * As regras de NEGÓCIO (o que é obrigatório, que quadro vale para cada tipo de
 * cliente) ficam no backend, em `modules/clientes/ficha.rules.ts`.
 */
import {
  BENEFICIARIOS_OPCOES,
  CODIGO_ROTINA_OPCOES,
  CONSTRUCAO_CIVIL_OPCOES,
  CPRB_OPCOES,
  DOCUMENTO_OPCOES,
  EMPRESA_SST_OPCOES,
  ENCARGOS_ESCRITORIO_OPCOES,
  FORMA_ENVIO_OPCOES,
  FORMA_PAGAMENTO_OPCOES,
  META_ENTREGA_OPCOES,
  PRAZO_ENVIO_OPCOES,
  OPCAO_RECOLHIMENTO_OPCOES,
  OPERADORA_OPCOES,
  POSSUI_FOLHA_OPCOES,
  POSSUI_LAUDO_OPCOES,
  PROCURACAO_DATA,
  PROCURACAO_OPCOES,
  RESPONSAVEL_FOLHA_OPCOES,
  SIM_NAO_NA,
  TERMO_RESPONSABILIDADE_OPCOES,
  TIPO_SEGURADO_OPCOES,
  VENCIMENTO_LAUDO_DATA,
  VENCIMENTO_LAUDO_OPCOES,
} from './listas';

export type FieldType = 'text' | 'multiline' | 'date' | 'number' | 'select';
export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  wide?: boolean;
  options?: string[];
  /** Valor calculado a partir de outros campos — exibido só para leitura. */
  derived?: boolean;
  /** Só aparece quando esta condição for verdadeira para o estado atual. */
  showIf?: (form: Record<string, string>) => boolean;
}

// Quadros com campos escalares (os demais — sindicais, empregador doméstico, senhas — são customizados).
export const SCALAR_CARDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Informações tributárias',
    fields: [
      { key: 'fator_r', label: 'Fator "R"?', type: 'select', options: SIM_NAO_NA },
      { key: 'atividade_concomitante', label: 'Atividades concomitantes', type: 'select', options: SIM_NAO_NA },
      { key: 'inss_retido_nf', label: 'INSS retido na NF?', type: 'select', options: SIM_NAO_NA },
      { key: 'construcao_civil', label: 'Construção civil?', type: 'select', options: CONSTRUCAO_CIVIL_OPCOES },
      { key: 'cprb', label: 'CPRB?', type: 'select', options: CPRB_OPCOES },
      {
        key: 'encargos_recolhidos_escritorio',
        label: 'Encargos recolhidos pelo escritório',
        type: 'select',
        options: ENCARGOS_ESCRITORIO_OPCOES,
      },
    ],
  },
  {
    title: 'Admissão',
    fields: [
      { key: 'concede_plano_saude', label: 'Concede plano de saúde?', type: 'select', options: SIM_NAO_NA },
      { key: 'plano_operadora', label: 'Operadora do plano', type: 'select', options: OPERADORA_OPCOES },
      { key: 'plano_beneficiarios', label: 'Beneficiários do plano', type: 'select', options: BENEFICIARIOS_OPCOES },
      { key: 'forma_pagamento_salarios', label: 'Forma de pagamento dos salários', type: 'select', options: FORMA_PAGAMENTO_OPCOES },
      { key: 'prazo_contrato_experiencia', label: 'Prazo do contrato de experiência' },
      { key: 'cargos_insalubres_perigosos', label: 'Possui cargos insalubres ou perigosos?', type: 'select', options: SIM_NAO_NA },
      { key: 'lancamentos_fixos', label: 'Possui lançamentos fixos?', type: 'select', options: SIM_NAO_NA },
      { key: 'relatorios_admissao', label: 'Relatórios admissionais', type: 'multiline', wide: true },
      { key: 'particularidades_cliente', label: 'Especificidades do cliente', type: 'multiline', wide: true },
    ],
  },
  {
    title: 'Fechamento da folha',
    fields: [
      { key: 'possui_folha', label: 'Possui folha?', type: 'select', options: POSSUI_FOLHA_OPCOES },
      { key: 'responsavel_fechamento_folha', label: 'Responsável pelo fechamento da folha', type: 'select', options: RESPONSAVEL_FOLHA_OPCOES },
      { key: 'folha_rotina_automatica', label: 'Gera folha via rotina automática?', type: 'select', options: SIM_NAO_NA },
      { key: 'codigo_rotina_automatica', label: 'Código da rotina automática', type: 'select', options: CODIGO_ROTINA_OPCOES },
      { key: 'data_meta_entrega_folha', label: 'Meta de entrega da folha', type: 'select', options: META_ENTREGA_OPCOES },
      { key: 'prazo_envio_folhas', label: 'Prazo para envio das folhas', type: 'select', options: PRAZO_ENVIO_OPCOES },
      { key: 'apura_ponto_escritorio', label: 'Apura o ponto pelo escritório?', type: 'select', options: SIM_NAO_NA },
      { key: 'realiza_lancamentos', label: 'Realiza lançamentos?', type: 'select', options: SIM_NAO_NA },
      { key: 'observacoes_folha', label: 'Informações importantes no fechamento da folha', type: 'multiline', wide: true },
    ],
  },
  {
    title: 'Informações sobre SST',
    fields: [
      { key: 'possui_laudos_sst', label: 'Possui laudo de SST?', type: 'select', options: POSSUI_LAUDO_OPCOES },
      { key: 'empresa_responsavel_sst', label: 'Empresa responsável', type: 'select', options: EMPRESA_SST_OPCOES },
      // Vencimento é híbrido: escolhe-se a situação e, só em "Data informada",
      // abre-se o campo de data (que é o que alimenta os alertas do dashboard).
      {
        key: 'data_vencimento_laudo_situacao',
        label: 'Data de vencimento',
        type: 'select',
        options: VENCIMENTO_LAUDO_OPCOES,
      },
      {
        key: 'data_vencimento_laudo',
        label: 'Vencimento do laudo',
        type: 'date',
        showIf: (f) => f.data_vencimento_laudo_situacao === VENCIMENTO_LAUDO_DATA,
      },
      {
        key: 'termo_ciencia_sst',
        label: 'Assinou termo de responsabilidade?',
        type: 'select',
        options: TERMO_RESPONSABILIDADE_OPCOES,
      },
    ],
  },
  {
    title: 'Forma de envio dos documentos',
    fields: [
      { key: 'envio_meio', label: 'Forma de envio', type: 'select', options: FORMA_ENVIO_OPCOES },
      { key: 'envio_documento', label: 'Documento', type: 'select', options: DOCUMENTO_OPCOES },
      { key: 'envio_contato', label: 'Contato', type: 'multiline', wide: true },
    ],
  },
  {
    title: 'Dados de contribuintes individuais',
    fields: [
      { key: 'inss_nit', label: 'NIT' },
      { key: 'inss_tipo_segurado', label: 'Tipo de segurado', type: 'select', options: TIPO_SEGURADO_OPCOES },
      {
        key: 'inss_opcao_recolhimento',
        label: 'Opção de recolhimento',
        type: 'select',
        options: OPCAO_RECOLHIMENTO_OPCOES,
      },
      // Código e alíquota saem do par (tipo de segurado, opção de recolhimento).
      { key: 'inss_codigo_recolhimento', label: 'Código de recolhimento', derived: true },
      { key: 'inss_aliquota', label: 'Alíquota', derived: true },
      { key: 'inss_salario_contribuicao', label: 'Salário de contribuição', type: 'number' },
    ],
  },
  {
    title: 'Procurações',
    // Cada procuração é situação + data, como no laudo de SST: "Sem procuração"
    // precisa ser registrável, senão fica indistinguível de campo não preenchido.
    // DET e FGTS Digital são uma só procuração (é assim que a planilha do setor
    // trata, e é onde estão os dados importados).
    fields: [
      { key: 'venc_procuracao_rfb_situacao', label: 'Procuração RFB', type: 'select', options: PROCURACAO_OPCOES },
      {
        key: 'venc_procuracao_rfb',
        label: 'Vencimento da RFB',
        type: 'date',
        showIf: (f) => f.venc_procuracao_rfb_situacao === PROCURACAO_DATA,
      },
      { key: 'venc_procuracao_det_fgts_situacao', label: 'Procuração DET e FGTS Digital', type: 'select', options: PROCURACAO_OPCOES },
      {
        key: 'venc_procuracao_det_fgts',
        label: 'Vencimento da DET/FGTS',
        type: 'date',
        showIf: (f) => f.venc_procuracao_det_fgts_situacao === PROCURACAO_DATA,
      },
      { key: 'venc_procuracao_econsignado_situacao', label: 'Procuração e-Consignado', type: 'select', options: PROCURACAO_OPCOES },
      {
        key: 'venc_procuracao_econsignado',
        label: 'Vencimento do e-Consignado',
        type: 'date',
        showIf: (f) => f.venc_procuracao_econsignado_situacao === PROCURACAO_DATA,
      },
      { key: 'emails_notificacao_det', label: 'E-mails que recebem o DET', wide: true },
    ],
  },
];

export const NUMBER_FIELDS = new Set(['inss_salario_contribuicao', 'inss_aliquota']);
export const SCALAR_KEYS = SCALAR_CARDS.flatMap((c) => c.fields.map((f) => f.key));
