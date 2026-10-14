/**
 * Campos da ficha contábil (`cliente_contabil`) e do controle de imóveis
 * (`imoveis`), na ordem e nos grupos das planilhas do setor.
 *
 * Fonte única no backend: daqui saem as colunas que o UPDATE aceita, os
 * rótulos da trilha de alterações e as colunas (com grupos de cabeçalho) dos
 * relatórios que espelham as planilhas. A apresentação na tela (tipo de
 * campo, opções) fica no frontend, em `lib/contabil-campos.ts`.
 */

export interface CampoContabil {
  key: string;
  label: string;
  /** Grupo de cabeçalho, como as células mescladas da planilha. */
  grupo: string;
}

const DADOS = 'Dados da empresa';
const TRIB = 'Informações tributárias';
const DISP = 'Ativo circulante — Disponibilidades';
const CLI = 'Ativo circulante — Clientes';
const EST = 'Ativo circulante — Estoque';
const DESP = 'Ativo circulante — Despesas do exercício seguinte';
const INV = 'Ativo não circulante — Investimentos';
const IMOB = 'Ativo não circulante — Imobilizado';
const FORN = 'Passivo circulante — Fornecedores';
const EMPR = 'Passivo circulante — Empréstimos e financiamentos';
const PL = 'Patrimônio líquido — Lucros acumulados';

/** Planilha "Informações Gerais" — tudo o que não está no cadastro geral do cliente. */
export const CAMPOS_CONTABIL = [
  { key: 'grupo_empresarial', label: 'Grupo empresarial', grupo: DADOS },
  { key: 'ramo_atividade', label: 'Ramo de atividade', grupo: DADOS },
  { key: 'responsavel', label: 'Responsável (contábil)', grupo: DADOS },
  { key: 'prioridade', label: 'Prioridade', grupo: DADOS },
  { key: 'nbc_tg', label: 'NBC TG utilizada', grupo: DADOS },
  { key: 'checklist_conferencia', label: 'Checklist de conferência utilizado', grupo: DADOS },
  { key: 'possui_software_gestao', label: 'Possui software de gestão interno?', grupo: DADOS },
  { key: 'possui_pj_qsa', label: 'Possui pessoa jurídica no QSA da empresa?', grupo: DADOS },

  { key: 'periodicidade_irpj_csll', label: 'Periodicidade e apuração do IRPJ/CSLL', grupo: TRIB },
  { key: 'forma_apuracao_irpj_csll', label: 'Forma de apuração do IRPJ/CSLL mensal', grupo: TRIB },
  { key: 'possui_beneficio_fiscal', label: 'Possui benefício fiscal relativo a IRPJ e CSLL?', grupo: TRIB },
  { key: 'qual_beneficio_fiscal', label: 'Qual benefício possui?', grupo: TRIB },

  { key: 'contabiliza_contas_bancarias', label: 'Contabiliza contas bancárias?', grupo: DISP },
  { key: 'usa_contabilidade_digital', label: 'Utiliza o módulo Contabilidade Digital?', grupo: DISP },
  { key: 'contabiliza_aplicacoes', label: 'Contabiliza aplicações financeiras?', grupo: DISP },
  { key: 'recebe_cartao_credito', label: 'Recebe via cartão de crédito?', grupo: DISP },

  { key: 'controla_contas_receber', label: 'Controla o contas a receber?', grupo: CLI },
  { key: 'envia_relacao_recebimentos', label: 'Nos envia mensalmente a relação de recebimentos de vendas?', grupo: CLI },
  { key: 'envia_relatorio_contas_receber', label: 'Nos envia mensalmente o relatório de contas a receber na data do levantamento do balancete?', grupo: CLI },

  { key: 'possui_estoque', label: 'Possui estoque(s) de mercadoria(s)?', grupo: EST },
  { key: 'tipos_estoque', label: 'Que tipo(s) de estoque(s) possui?', grupo: EST },
  { key: 'controla_estoque', label: 'Faz controle do(s) estoque(s)?', grupo: EST },
  { key: 'envia_cmv', label: 'Irá nos enviar mensalmente o valor do CMV/CPV?', grupo: EST },
  { key: 'margem_valor_agregado', label: 'Caso não realize o cálculo mensal do custo, qual a margem média de valor agregado dos produtos?', grupo: EST },
  { key: 'envia_inventario', label: 'Irá nos enviar mensalmente o inventário do(s) estoque(s)?', grupo: EST },

  { key: 'paga_anuidade_orgao_classe', label: 'A empresa paga anuidade a algum órgão de classe?', grupo: DESP },
  { key: 'possui_imoveis_urbanos', label: 'A empresa possui imóveis urbanos (IPTU)?', grupo: DESP },
  { key: 'possui_imoveis_rurais', label: 'A empresa possui imóveis rurais (ITR)?', grupo: DESP },
  { key: 'possui_veiculos', label: 'Possui veículos (IPVA)?', grupo: DESP },
  { key: 'possui_seguros', label: 'Possui seguros?', grupo: DESP },
  { key: 'possui_alvara_sanitario', label: 'Possui alvará sanitário?', grupo: DESP },
  { key: 'possui_licenca_ambiental', label: 'Possui licença ambiental?', grupo: DESP },

  { key: 'contabiliza_investimentos', label: 'Contabiliza investimentos financeiros?', grupo: INV },
  { key: 'possui_participacoes_societarias', label: 'Possui participação(ões) societária(s) em outra(s) empresa(s)?', grupo: INV },
  { key: 'possui_imobilizado', label: 'Possui imobilizado(s)?', grupo: IMOB },

  { key: 'controla_contas_pagar', label: 'Controla o contas a pagar?', grupo: FORN },
  { key: 'envia_relacao_pagamentos', label: 'Nos envia mensalmente a relação dos pagamentos de fornecedores?', grupo: FORN },
  { key: 'envia_relatorio_contas_pagar', label: 'Nos envia mensalmente o relatório de contas a pagar na data do levantamento do balancete?', grupo: FORN },
  { key: 'possui_emprestimos', label: 'Possui empréstimos e financiamentos (bancários ou com terceiros)?', grupo: EMPR },

  { key: 'forma_distribuicao_lucros', label: 'Forma de distribuição dos lucros', grupo: PL },
] as const satisfies readonly CampoContabil[];

export type CampoContabilKey = (typeof CAMPOS_CONTABIL)[number]['key'];

const DESCR = 'Descrição detalhada do imóvel';
const INTEG = 'Processo de integralização';
const IPTU = 'Informações para o cálculo anual do IPTU';
const CONT = 'Informações contábeis';

/** Planilha "Controle de imóveis" (FRSoc-019), sem o número de ordem e o cliente. */
export const CAMPOS_IMOVEL = [
  { key: 'tipo', label: 'Tipo do imóvel', grupo: DESCR },
  { key: 'municipio', label: 'Município', grupo: DESCR },
  { key: 'matricula', label: 'Matrícula', grupo: DESCR },
  { key: 'cib', label: 'CIB', grupo: DESCR },
  { key: 'codigo_prefeitura', label: 'Cód. imóvel reduzido (Prefeitura)', grupo: DESCR },
  { key: 'lugar', label: 'Lugar', grupo: DESCR },
  { key: 'lote', label: 'Lote', grupo: DESCR },
  { key: 'quadra', label: 'Quadra', grupo: DESCR },
  { key: 'loteamento', label: 'Loteamento', grupo: DESCR },
  { key: 'area', label: 'Área', grupo: DESCR },
  { key: 'cartorio', label: 'Cartório em que está registrado', grupo: DESCR },
  { key: 'forma_aquisicao', label: 'Forma de aquisição do imóvel', grupo: DESCR },
  { key: 'utilizacao', label: 'Utilização atual do imóvel', grupo: DESCR },

  { key: 'itbi_isencao_obtida', label: 'Obtida a declaração de isenção de ITBI?', grupo: INTEG },
  { key: 'itbi_diferenca_paga', label: 'Pago diferença de ITBI?', grupo: INTEG },
  { key: 'documentos_enviados_ri', label: 'Documentos enviados para o RI para integralização?', grupo: INTEG },
  { key: 'integralizacao_concluida', label: 'Integralização concluída?', grupo: INTEG },
  { key: 'titularidade_prefeitura', label: 'Alteração de titularidade realizada na prefeitura?', grupo: INTEG },
  { key: 'transferencia_finalizada', label: 'Processo de transferência para a holding totalmente finalizado?', grupo: INTEG },

  { key: 'valor_venal', label: 'Valor venal do imóvel na prefeitura', grupo: IPTU },
  { key: 'indice_atualizacao', label: 'Índice de atualização do ano', grupo: IPTU },
  { key: 'dados_aliquota', label: 'Dados para achar a alíquota', grupo: IPTU },

  { key: 'valor_aquisicao', label: 'Valor de aquisição do imóvel', grupo: CONT },
  { key: 'contabilizado', label: 'Imóvel contabilizado?', grupo: CONT },
  { key: 'grupo_contabilizado', label: 'Grupo em que foi contabilizado', grupo: CONT },
  { key: 'itbi_contabilizado', label: 'ITBI contabilizado?', grupo: CONT },
  { key: 'taxas_cartorio_contabilizadas', label: 'Taxas de cartório contabilizadas?', grupo: CONT },

  { key: 'situacao', label: 'Situação do imóvel', grupo: 'Situação do imóvel' },
] as const satisfies readonly CampoContabil[];

export type CampoImovelKey = (typeof CAMPOS_IMOVEL)[number]['key'];

/** Colunas `numeric` do imóvel. */
export const CAMPOS_IMOVEL_NUMERICOS = new Set<string>(['valor_venal', 'valor_aquisicao']);

/**
 * As seis etapas da integralização, na ordem da planilha. O imóvel recebido
 * por integralização só está regularizado quando todas estão em "Sim".
 */
export const ETAPAS_INTEGRALIZACAO = [
  'itbi_isencao_obtida',
  'itbi_diferenca_paga',
  'documentos_enviados_ri',
  'integralizacao_concluida',
  'titularidade_prefeitura',
  'transferencia_finalizada',
] as const satisfies readonly CampoImovelKey[];

export const FORMA_INTEGRALIZACAO = 'Integralização';

/** Mapa campo → rótulo (para a trilha de alterações). */
export const rotulos = (campos: readonly CampoContabil[]): Record<string, string> =>
  Object.fromEntries(campos.map((c) => [c.key, c.label]));
