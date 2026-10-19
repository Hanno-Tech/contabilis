/**
 * Setor contábil — listas suspensas e catálogo de apresentação da ficha
 * contábil e do controle de imóveis.
 *
 * Fontes: planilhas "Informações Gerais" e "Controle de imóveis" (FRSoc-019)
 * do setor. Ao receber uma versão nova delas, é aqui que se atualiza. As chaves
 * e os rótulos espelham `backend/src/modules/contabil/contabil.campos.ts`, que
 * é quem define as colunas, a auditoria e os relatórios.
 */
import type { FieldDef } from './ficha-campos';

export const SIM_NAO = ['Sim', 'Não'];

// ------------------------------------------------------- Informações gerais
export const GRUPO_EMPRESARIAL_OPCOES = [
  'Grupo Pop (Júnior)',
  'Grupo Pop (Larissa)',
  'Grupo Zanolli',
  'Grupo mercadão dos óculos',
  'Grupo Felipe Réus',
  'Grupo Silva pré-moldados',
  'Grupo Menegon',
  'Grupo Marcos Vefago',
  'Grupo Ivan Felício',
  'Grupo Sálvio de Luca',
  'Grupo Jéssica Zanette',
  'Grupo Everton Zanette',
  'Grupo Rodrigo Búrigo Niero',
  'Grupo Cardial',
  'Grupo Majope',
  'Grupo Cléber Zanatta',
  'Grupo Robson Minotto',
  'Grupo Vila Franca',
  'Grupo Rafael da Luz',
  'Grupo Pedro Vitche',
  'Grupo Ika',
  'Grupo Tocca',
  'Grupo Yonara',
  'Grupo Ótica Cásio',
  'Grupo Roberto Soares',
];
export const RAMO_ATIVIDADE_OPCOES = [
  'Holding',
  'Administradora de bens',
  'Construtora',
  'Loteamento',
  'Serviços',
  'Comércio',
  'Indústria',
  'Associações',
  'Restaurante',
  'e-Commerce',
  'Importação',
  'Revenda de veículos',
];
export const RESPONSAVEL_CONTABIL_OPCOES = ['Laura', 'Sarah', 'Marina'];
export const PRIORIDADE_OPCOES = ['Altíssima', 'Alta', 'Normal'];
export const NBC_TG_OPCOES = ['1000', '1001', '1002'];
export const PERIODICIDADE_IRPJ_OPCOES = ['Trimestral', 'Anual'];
export const FORMA_APURACAO_IRPJ_OPCOES = ['Balancete de redução ou suspensão', 'Estimativa'];
export const TIPOS_ESTOQUE_OPCOES = [
  'Estoque de Mercadorias para Revenda',
  'Estoque de Matérias Primas',
  'Estoque de Materiais de Embalagens',
  'Estoque de Produtos em elaboração',
  'Estoque de Produtos Acabados',
  'Estoque de Mercadorias Recebidas para Conserto',
  'Estoque de Mercadorias Enviadas para Conserto',
  'Estoque de Mercadorias Recebidas para Troca',
  'Estoque de Mercadorias Enviadas para Troca',
  'Estoque de Mercadorias Recebidas para Industrialização',
  'Estoque de Mercadorias Enviadas para Industrialização',
];

/** Separador dos tipos de estoque, gravados juntos numa coluna de texto. */
export const SEPARADOR_MULTI = '; ';

/**
 * Regra da planilha para "Qual benefício possui?": com "Não" no campo
 * anterior, vira "Não" automaticamente; com "Sim", abre o campo.
 */
export const SEM_BENEFICIO = 'Não';

const temEstoque = (f: Record<string, string>) => f.possui_estoque === 'Sim';

/** Quadros da ficha contábil, na ordem e com os agrupamentos da planilha. */
export const QUADROS_CONTABIL: { title: string; subtitle?: string; fields: FieldDef[] }[] = [
  {
    title: 'Dados da empresa',
    fields: [
      { key: 'grupo_empresarial', label: 'Grupo empresarial', type: 'combo', options: GRUPO_EMPRESARIAL_OPCOES },
      { key: 'ramo_atividade', label: 'Ramo de atividade', type: 'select', options: RAMO_ATIVIDADE_OPCOES },
      { key: 'responsavel', label: 'Responsável', type: 'select', options: RESPONSAVEL_CONTABIL_OPCOES },
      { key: 'prioridade', label: 'Prioridade', type: 'select', options: PRIORIDADE_OPCOES },
      { key: 'nbc_tg', label: 'NBC TG utilizada', type: 'select', options: NBC_TG_OPCOES },
      { key: 'checklist_conferencia', label: 'Checklist de conferência utilizado' },
      { key: 'possui_software_gestao', label: 'Possui software de gestão interno?', type: 'select', options: SIM_NAO },
      { key: 'possui_pj_qsa', label: 'Possui pessoa jurídica no QSA da empresa?', type: 'select', options: SIM_NAO },
    ],
  },
  {
    title: 'Informações tributárias',
    fields: [
      { key: 'periodicidade_irpj_csll', label: 'Periodicidade e apuração do IRPJ/CSLL', type: 'select', options: PERIODICIDADE_IRPJ_OPCOES },
      { key: 'forma_apuracao_irpj_csll', label: 'Forma de apuração do IRPJ/CSLL mensal', type: 'select', options: FORMA_APURACAO_IRPJ_OPCOES },
      { key: 'possui_beneficio_fiscal', label: 'Possui benefício fiscal relativo a IRPJ e CSLL?', type: 'select', options: SIM_NAO },
      {
        key: 'qual_beneficio_fiscal',
        label: 'Qual benefício possui?',
        wide: true,
        showIf: (f) => f.possui_beneficio_fiscal === 'Sim',
      },
    ],
  },
  {
    title: 'Ativo circulante',
    subtitle: 'Disponibilidades',
    fields: [
      { key: 'contabiliza_contas_bancarias', label: 'Contabiliza contas bancárias?', type: 'select', options: SIM_NAO },
      { key: 'usa_contabilidade_digital', label: 'Utiliza o módulo Contabilidade Digital?', type: 'select', options: SIM_NAO },
      { key: 'contabiliza_aplicacoes', label: 'Contabiliza aplicações financeiras?', type: 'select', options: SIM_NAO },
      { key: 'recebe_cartao_credito', label: 'Recebe via cartão de crédito?', type: 'select', options: SIM_NAO },
    ],
  },
  {
    title: 'Ativo circulante',
    subtitle: 'Clientes',
    fields: [
      { key: 'controla_contas_receber', label: 'Controla o contas a receber?', type: 'select', options: SIM_NAO },
      { key: 'envia_relacao_recebimentos', label: 'Nos envia mensalmente a relação de recebimentos de vendas?', type: 'select', options: SIM_NAO },
      { key: 'envia_relatorio_contas_receber', label: 'Nos envia mensalmente o relatório de contas a receber na data do levantamento do balancete?', type: 'select', options: SIM_NAO },
    ],
  },
  {
    title: 'Ativo circulante',
    subtitle: 'Estoque',
    fields: [
      { key: 'possui_estoque', label: 'Possui estoque(s) de mercadoria(s)?', type: 'select', options: SIM_NAO },
      { key: 'tipos_estoque', label: 'Que tipo(s) de estoque(s) possui?', type: 'multiselect', options: TIPOS_ESTOQUE_OPCOES, wide: true, showIf: temEstoque },
      { key: 'controla_estoque', label: 'Faz controle do(s) estoque(s)?', type: 'select', options: SIM_NAO, showIf: temEstoque },
      { key: 'envia_cmv', label: 'Irá nos enviar mensalmente o valor do CMV/CPV?', type: 'select', options: SIM_NAO, showIf: temEstoque },
      {
        key: 'margem_valor_agregado',
        label: 'Caso não realize o cálculo mensal do custo, qual a margem média de valor agregado dos produtos?',
        wide: true,
        showIf: (f) => temEstoque(f) && f.envia_cmv === 'Não',
      },
      { key: 'envia_inventario', label: 'Irá nos enviar mensalmente o inventário do(s) estoque(s)?', type: 'select', options: SIM_NAO, showIf: temEstoque },
    ],
  },
  {
    title: 'Ativo circulante',
    subtitle: 'Despesas do exercício seguinte',
    fields: [
      { key: 'paga_anuidade_orgao_classe', label: 'A empresa paga anuidade a algum órgão de classe?', type: 'select', options: SIM_NAO },
      { key: 'possui_imoveis_urbanos', label: 'A empresa possui imóveis urbanos (IPTU)?', type: 'select', options: SIM_NAO },
      { key: 'possui_imoveis_rurais', label: 'A empresa possui imóveis rurais (ITR)?', type: 'select', options: SIM_NAO },
      { key: 'possui_veiculos', label: 'Possui veículos (IPVA)?', type: 'select', options: SIM_NAO },
      { key: 'possui_seguros', label: 'Possui seguros?', type: 'select', options: SIM_NAO },
      { key: 'possui_alvara_sanitario', label: 'Possui alvará sanitário?', type: 'select', options: SIM_NAO },
      { key: 'possui_licenca_ambiental', label: 'Possui licença ambiental?', type: 'select', options: SIM_NAO },
    ],
  },
  {
    title: 'Ativo não circulante',
    subtitle: 'Investimentos e imobilizado',
    fields: [
      { key: 'contabiliza_investimentos', label: 'Contabiliza investimentos financeiros?', type: 'select', options: SIM_NAO },
      { key: 'possui_participacoes_societarias', label: 'Possui participação(ões) societária(s) em outra(s) empresa(s)?', type: 'select', options: SIM_NAO },
      { key: 'possui_imobilizado', label: 'Possui imobilizado(s)?', type: 'select', options: SIM_NAO },
    ],
  },
  {
    title: 'Passivo circulante',
    subtitle: 'Fornecedores, empréstimos e financiamentos',
    fields: [
      { key: 'controla_contas_pagar', label: 'Controla o contas a pagar?', type: 'select', options: SIM_NAO },
      { key: 'envia_relacao_pagamentos', label: 'Nos envia mensalmente a relação dos pagamentos de fornecedores?', type: 'select', options: SIM_NAO },
      { key: 'envia_relatorio_contas_pagar', label: 'Nos envia mensalmente o relatório de contas a pagar na data do levantamento do balancete?', type: 'select', options: SIM_NAO },
      { key: 'possui_emprestimos', label: 'Possui empréstimos e financiamentos (bancários ou com terceiros)?', type: 'select', options: SIM_NAO },
    ],
  },
  {
    title: 'Patrimônio líquido',
    subtitle: 'Lucros acumulados',
    fields: [
      { key: 'forma_distribuicao_lucros', label: 'Forma de distribuição dos lucros', type: 'multiline', wide: true },
    ],
  },
];

export const CHAVES_CONTABIL = QUADROS_CONTABIL.flatMap((q) => q.fields.map((f) => f.key));

// --------------------------------------------------------- Controle de imóveis
export const TIPO_IMOVEL_OPCOES = ['Urbano', 'Rural'];
export const FORMA_AQUISICAO_OPCOES = ['Integralização', 'Compra', 'Recebido em doação'];
export const FORMA_INTEGRALIZACAO = 'Integralização';
export const UTILIZACAO_IMOVEL_OPCOES = [
  'Investimento',
  'Em estoque para venda',
  'Locado',
  'Em processo de loteamento',
];
export const GRUPO_CONTABILIZADO_OPCOES = ['Imobilizado', 'Estoque'];
export const SITUACAO_IMOVEL_OPCOES = [
  'Ativo',
  'Vendido',
  'Transformado em Empreendimento Imobiliário',
  'Permutado',
  'Utilizado para Liquidação de Quotas',
  'Devolvido ao Sócio por Redução de Capital Social',
];

/** As seis etapas da integralização, na ordem da planilha. */
export const ETAPAS_INTEGRALIZACAO = [
  'itbi_isencao_obtida',
  'itbi_diferenca_paga',
  'documentos_enviados_ri',
  'integralizacao_concluida',
  'titularidade_prefeitura',
  'transferencia_finalizada',
];

/** Quadros do imóvel, nos grupos da planilha FRSoc-019. */
export const QUADROS_IMOVEL: {
  title: string;
  nota?: string;
  /** Perguntas longas: o texto vai acima do campo em vez de virar rótulo flutuante (cortado). */
  perguntas?: boolean;
  fields: FieldDef[];
}[] = [
  {
    title: 'Descrição detalhada do imóvel',
    fields: [
      { key: 'tipo', label: 'Tipo do imóvel', type: 'select', options: TIPO_IMOVEL_OPCOES },
      { key: 'municipio', label: 'Município' },
      { key: 'matricula', label: 'Matrícula' },
      { key: 'cib', label: 'CIB' },
      { key: 'codigo_prefeitura', label: 'Cód. imóvel reduzido (Prefeitura)' },
      { key: 'lugar', label: 'Lugar' },
      { key: 'lote', label: 'Lote' },
      { key: 'quadra', label: 'Quadra' },
      { key: 'loteamento', label: 'Loteamento' },
      { key: 'area', label: 'Área' },
      { key: 'cartorio', label: 'Cartório em que está registrado', wide: true },
      { key: 'forma_aquisicao', label: 'Forma de aquisição do imóvel', type: 'select', options: FORMA_AQUISICAO_OPCOES },
      { key: 'utilizacao', label: 'Utilização atual do imóvel', type: 'select', options: UTILIZACAO_IMOVEL_OPCOES },
    ],
  },
  {
    title: 'Processo de integralização',
    perguntas: true,
    nota: 'Acompanhe aqui a transferência do imóvel para a holding. As seis etapas valem para imóveis recebidos por integralização.',
    fields: [
      { key: 'itbi_isencao_obtida', label: 'Obtida a declaração de isenção de ITBI?', type: 'select', options: SIM_NAO },
      { key: 'itbi_diferenca_paga', label: 'Pago diferença de ITBI?', type: 'select', options: SIM_NAO },
      { key: 'documentos_enviados_ri', label: 'Documentos enviados para o RI para integralização?', type: 'select', options: SIM_NAO },
      { key: 'integralizacao_concluida', label: 'Integralização concluída?', type: 'select', options: SIM_NAO },
      { key: 'titularidade_prefeitura', label: 'Alteração de titularidade realizada na prefeitura?', type: 'select', options: SIM_NAO },
      { key: 'transferencia_finalizada', label: 'Processo de transferência para a holding totalmente finalizado?', type: 'select', options: SIM_NAO },
    ],
  },
  {
    title: 'Informações para o cálculo anual do IPTU',
    fields: [
      { key: 'valor_venal', label: 'Valor venal do imóvel na prefeitura (R$)', type: 'number' },
      { key: 'indice_atualizacao', label: 'Índice de atualização do ano' },
      { key: 'dados_aliquota', label: 'Dados para achar a alíquota', type: 'multiline', wide: true },
    ],
  },
  {
    title: 'Informações contábeis',
    fields: [
      { key: 'valor_aquisicao', label: 'Valor de aquisição do imóvel (R$)', type: 'number' },
      { key: 'contabilizado', label: 'Imóvel contabilizado?', type: 'select', options: SIM_NAO },
      { key: 'grupo_contabilizado', label: 'Grupo em que foi contabilizado', type: 'select', options: GRUPO_CONTABILIZADO_OPCOES },
      { key: 'itbi_contabilizado', label: 'ITBI contabilizado?', type: 'select', options: SIM_NAO },
      { key: 'taxas_cartorio_contabilizadas', label: 'Taxas de cartório contabilizadas?', type: 'select', options: SIM_NAO },
    ],
  },
  {
    title: 'Situação do imóvel',
    fields: [{ key: 'situacao', label: 'Situação', type: 'select', options: SITUACAO_IMOVEL_OPCOES }],
  },
];

export const CHAVES_IMOVEL = QUADROS_IMOVEL.flatMap((q) => q.fields.map((f) => f.key));
export const CHAVES_IMOVEL_NUMERICAS = new Set(['valor_venal', 'valor_aquisicao']);

/** Progresso da integralização: quantas das seis etapas estão em "Sim". */
export function progressoIntegralizacao(imovel: Record<string, unknown>): number {
  return ETAPAS_INTEGRALIZACAO.filter((e) => imovel[e] === 'Sim').length;
}
