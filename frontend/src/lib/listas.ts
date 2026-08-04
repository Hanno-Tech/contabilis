/**
 * Listas suspensas da ficha do cliente.
 *
 * Fonte: planilha "Listas Suspensas" mantida pelo setor pessoal. Ao receber uma
 * versão nova da planilha, é aqui que se atualiza — os formulários só consomem.
 */

export const SIM_NAO_NA = ['Sim', 'Não', 'Não se aplica'];

// ------------------------------------------------- Informações tributárias
export const CONSTRUCAO_CIVIL_OPCOES = ['Sim', 'Não'];
export const CPRB_OPCOES = ['Sim', 'Não', 'Não se aplica'];
export const ENCARGOS_ESCRITORIO_OPCOES = ['Sim', 'Não', 'Não Possui', 'Não se aplica'];

// ------------------------------------------------------ Fechamento da folha
export const CODIGO_ROTINA_OPCOES = [
  '11 – Cálculo de Pró-labore Simples',
  '12 – Cálculo de empresas com funcionários e sem lançamentos',
  '13 -Cálculo das empresas Fator “R” – Pró-labores',
];
export const META_ENTREGA_OPCOES = [
  'Dia 28 do mês da folha',
  '1º dia útil',
  '2º dia útil',
  '3º dia útil',
];

// --------------------------------------------------------------------- SST
export const POSSUI_LAUDO_OPCOES = ['Sim', 'Não', 'Desobrigada'];
export const EMPRESA_SST_OPCOES = [
  'Medset',
  'Probem',
  'Maxipas',
  'Dra. Laura',
  'Mioprev',
  'Ergomed',
  'MedIçara',
  'Mais Proteção',
  'Sesi',
  'MedCri',
  'Macroseg',
  'Previ&Seg',
  'CliniSeg',
  'CliniMet',
  'Não se aplica',
];
export const TERMO_RESPONSABILIDADE_OPCOES = ['Sim', 'Não', 'Desobrigada', 'Não de aplica'];

/**
 * Vencimento do laudo é híbrido: ou é uma das situações fixas, ou é uma data.
 * `DATA_INFORMADA` é a opção que abre o campo de data no formulário — o valor
 * em si vai para `data_vencimento_laudo`, e a situação para
 * `data_vencimento_laudo_situacao`.
 */
export const VENCIMENTO_LAUDO_DATA = 'Data informada';
export const VENCIMENTO_LAUDO_OPCOES = [
  'Desobrigada',
  'Não possui Laudo',
  VENCIMENTO_LAUDO_DATA,
];

/**
 * Procurações seguem o mesmo padrão do laudo. Sem isso, "não tem procuração"
 * ficava indistinguível de "ainda não cadastramos" — e o cliente nunca saía da
 * lista de fichas incompletas.
 */
export const PROCURACAO_DATA = 'Data informada';
export const PROCURACAO_OPCOES = ['Sem procuração', 'Não se aplica', PROCURACAO_DATA];

// -------------------------------------------- Forma de envio dos documentos
export const FORMA_ENVIO_OPCOES = [
  'Físico',
  'E-mail (Gestta processos)',
  'Whatsapp (Gestta messenger)',
  'Entregar para julio',
  'Nao enviar',
  'Email fora do gestta',
  'Vide coluna "Contato"',
  'Não se aplica',
];
export const DOCUMENTO_OPCOES = [
  'Folhas',
  'Guias',
  'Folhas e Guias',
  'Guia de INSS',
  'Folhas, Guias e relatórios',
  'Folha doméstica e DAE',
  'Não se aplica',
];

// --------------------------------------------- Dados de contribuintes individuais
export const TIPO_SEGURADO_OPCOES = ['Autônomo', 'Facultativo'];
export const OPCAO_RECOLHIMENTO_OPCOES = ['Simplificado', 'Normal'];

/**
 * Código de recolhimento e alíquota não são digitados: saem do par
 * (tipo de segurado, opção de recolhimento).
 */
const TABELA_RECOLHIMENTO: Record<string, { codigo: string; aliquota: string }> = {
  'Autônomo|Simplificado': { codigo: '1163', aliquota: '0.11' },
  'Autônomo|Normal': { codigo: '1007', aliquota: '0.20' },
  'Facultativo|Simplificado': { codigo: '1473', aliquota: '0.11' },
  'Facultativo|Normal': { codigo: '1406', aliquota: '0.20' },
};

export function derivarRecolhimento(
  tipoSegurado: string,
  opcaoRecolhimento: string,
): { codigo: string; aliquota: string } | null {
  return TABELA_RECOLHIMENTO[`${tipoSegurado}|${opcaoRecolhimento}`] ?? null;
}

// -------------------------------------------------------- Outras (já existentes)
export const OPERADORA_OPCOES = ['2 - Saúde São José', '8 - Unimed', 'Não se aplica'];
export const BENEFICIARIOS_OPCOES = ['Colaborador', 'Colaborador e Dependente', 'Não se aplica'];
export const FORMA_PAGAMENTO_OPCOES = ['Dinheiro', 'Crédito em conta', 'Pix', 'Não se aplica'];
export const POSSUI_FOLHA_OPCOES = [
  'Não possui',
  'Possui apenas pró labore',
  'Possui apenas folha',
  'Possui folha e pró labore',
  'Possui folha de empregado doméstico',
  'Possui guia avulsa de INSS',
  'Possui apenas RPA',
  'Não se aplica',
];
export const RESPONSAVEL_FOLHA_OPCOES = [
  'Priscila',
  'Pâmela',
  'Gisele',
  'Samuel',
  'Fernanda',
  'Sem folha',
];
export const SITUACAO_CONVENCAO_OPCOES = ['Vigente', 'Vencida', 'Não se aplica'];

/** Filiação sindical — substitui o campo de texto livre do quadro sindical. */
export const FILIACAO_SINDICAL_OPCOES = [
  'Não se aplica',
  'Piso Estadual SC',
  'Sindicato dos Cerâmistas e Mobiliários de Criciúma e Região',
  'Sindicato do Comércio Varejista e Atacadista de Criciúma e Região',
  'SINDIVEST - Sindicato dos Trabalhadores no Vestuário e Calçados',
  'Ver - Confirmar',
  'SITRATUHCRI - Sind. Trab. Turismo Hosp. Hot. Rest. Bar. Simil. Cri',
  'Sindicato dos Trabalhadores Metalúrgicos de Criciúma e Região',
  'SINDASPI/SC - Sindicato dos Trabalhadores em Empresas de Assessoramento, Perícia, Pesquisa e Informações',
  'Federacao Nac dos Publicitarios Agenc de Publicidade, Trab em Agenc Propag, Trab em Publicidade',
  'SINTRACRIL - Sindicato dos Condutores de Veículos e Trabalhadores em Transportes',
  'SINTROTUR - Sindicato dos Condutores de Veículos e de Trabalhadores em Empresas de Transportes',
  'SINTICOM - Sind. Trab. Ind. Constr. Mob. e Cerâmica de Tubarão',
  'SINDPD/SC - Sindicato dos Emp Empr de Proc de dados de SC',
  'Sindicato dos Trabalhadores nas Indústrias Plásticas Descartáveis e Flexíveis',
  'SINTIACR - Sindicato dos Trabalhadores nas Indústrias da Alimentação',
  'SINDISAÚDE - Sind. Trab Estab de Serv. De Saúde de Criciúma e Reg.',
  'SITICOM - Sind. Trab. Ind. Constr. Mob. Morro da Fumaça',
  'SINDFAR-SC - Sindicato dos Farmaceuticos no estado de Sc',
];

// ------------------------------------------------------- Tipos de cliente
export const TIPO_CLIENTE_OPCOES = [
  'Empresa normal',
  'MEI',
  'Empregador doméstico',
  'Contribuinte Facultativo',
  'Contribuinte Individual',
  'Empregador rural',
  'Associação',
];

/**
 * Cópia de emergência da regra de quadros por tipo de cliente.
 *
 * A fonte é o backend (`ficha.rules.ts`), servida em
 * `GET /api/clientes/estrutura-ficha` — é ela que o dashboard usa para calcular
 * a completude. Isto aqui só cobre o intervalo entre abrir a tela e a resposta
 * chegar; se as duas divergirem, vale a do backend.
 */
const QUADROS_POR_TIPO_PADRAO: Record<string, string[]> = {
  'Empregador doméstico': [
    'Informações gerais',
    'Dados do empregador doméstico',
    'Procurações',
    'Forma de envio dos documentos',
    'Senhas',
  ],
  'Contribuinte Facultativo': [
    'Informações gerais',
    'Dados de contribuintes individuais',
    'Forma de envio dos documentos',
    'Senhas',
  ],
  'Contribuinte Individual': [
    'Informações gerais',
    'Dados de contribuintes individuais',
    'Forma de envio dos documentos',
    'Senhas',
  ],
};

/** Quadros que Empresa normal, MEI e Associação não usam. */
const QUADROS_OCULTOS_EMPRESA = ['Dados de contribuintes individuais', 'Dados do empregador doméstico'];
const TIPOS_EMPRESA = ['Empresa normal', 'MEI', 'Associação'];

/** Decide se um quadro deve aparecer para o tipo de cliente informado. */
export function quadroVisivel(
  quadro: string,
  tipoCliente: string | null | undefined,
  quadrosPorTipo: Record<string, string[]> = QUADROS_POR_TIPO_PADRAO,
): boolean {
  const tipo = (tipoCliente ?? '').trim();
  if (!tipo) return true; // sem tipo definido, mostra tudo

  if (TIPOS_EMPRESA.includes(tipo)) return !QUADROS_OCULTOS_EMPRESA.includes(quadro);

  const permitidos = quadrosPorTipo[tipo];
  return permitidos ? permitidos.includes(quadro) : true;
}

/** Tipos do cadastro de entidades externas (espelha TIPOS_ENTIDADE do backend). */
export const TIPOS_ENTIDADE = ['Sindicato', 'Empresa de SST'] as const;
