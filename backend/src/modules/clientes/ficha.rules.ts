/**
 * Estrutura da ficha do cliente: quais quadros existem, que campos cada um tem,
 * quais aparecem para cada tipo de cliente e o que é de fato exigido.
 *
 * Fonte única da regra. O dashboard usa isto para calcular a completude e o
 * frontend consome pelo endpoint `GET /api/clientes/estrutura-ficha` para
 * decidir que quadros mostrar — assim formulário e painel nunca discordam
 * sobre o que é exigível.
 */

export type Obrigatoriedade =
  | { tipo: 'obrigatorio' }
  /** Não entra no cálculo de completude (texto livre, ou sem fonte de dados). */
  | { tipo: 'opcional' }
  /** Só é exigido quando outro campo tem um dos valores listados. */
  | { tipo: 'condicional'; dependeDe: string; valores: string[] };

export interface CampoFicha {
  campo: string;
  rotulo: string;
  /** Em que tabela o campo vive — `clientes` ou `cliente_folha`. */
  origem: 'cliente' | 'folha';
  obrigatoriedade: Obrigatoriedade;
}

export interface QuadroFicha {
  titulo: string;
  campos: CampoFicha[];
}

const obrigatorio: Obrigatoriedade = { tipo: 'obrigatorio' };
const opcional: Obrigatoriedade = { tipo: 'opcional' };
const seSim = (dependeDe: string): Obrigatoriedade => ({
  tipo: 'condicional',
  dependeDe,
  valores: ['Sim'],
});
/** Data só é exigida quando a situação correspondente diz que existe uma. */
const seDataInformada = (dependeDe: string): Obrigatoriedade => ({
  tipo: 'condicional',
  dependeDe,
  valores: ['Data informada'],
});

export const QUADROS: QuadroFicha[] = [
  {
    titulo: 'Informações gerais',
    campos: [
      { campo: 'cnpj', rotulo: 'CNPJ/CPF', origem: 'cliente', obrigatoriedade: obrigatorio },
      { campo: 'tipo_cliente', rotulo: 'Tipo de cliente', origem: 'cliente', obrigatoriedade: obrigatorio },
      { campo: 'regime_tributacao', rotulo: 'Regime de tributação', origem: 'cliente', obrigatoriedade: obrigatorio },
      { campo: 'responsavel', rotulo: 'Responsável', origem: 'cliente', obrigatoriedade: obrigatorio },
      // Só há data de evento quando a situação mudou; cliente ativo não tem.
      { campo: 'data_evento_situacao', rotulo: 'Data da situação', origem: 'cliente', obrigatoriedade: opcional },
    ],
  },
  {
    titulo: 'Informações tributárias',
    campos: [
      { campo: 'fator_r', rotulo: 'Fator "R"', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'atividade_concomitante', rotulo: 'Atividade concomitante', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'inss_retido_nf', rotulo: 'INSS retido na NF', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'construcao_civil', rotulo: 'Construção civil', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'cprb', rotulo: 'CPRB', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'encargos_recolhidos_escritorio', rotulo: 'Encargos recolhidos pelo escritório', origem: 'folha', obrigatoriedade: obrigatorio },
    ],
  },
  {
    titulo: 'Admissão',
    campos: [
      { campo: 'concede_plano_saude', rotulo: 'Concede plano de saúde', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'plano_operadora', rotulo: 'Operadora do plano', origem: 'folha', obrigatoriedade: seSim('concede_plano_saude') },
      { campo: 'plano_beneficiarios', rotulo: 'Beneficiários do plano', origem: 'folha', obrigatoriedade: seSim('concede_plano_saude') },
      { campo: 'forma_pagamento_salarios', rotulo: 'Forma de pagamento dos salários', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'relatorios_admissao', rotulo: 'Relatórios admissionais', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'particularidades_cliente', rotulo: 'Especificidades do cliente', origem: 'folha', obrigatoriedade: obrigatorio },
      // Sem fonte em nenhuma planilha — preenchimento aos poucos, não cobrado.
      { campo: 'prazo_contrato_experiencia', rotulo: 'Prazo do contrato de experiência', origem: 'folha', obrigatoriedade: opcional },
      { campo: 'cargos_insalubres_perigosos', rotulo: 'Cargos insalubres ou perigosos', origem: 'folha', obrigatoriedade: opcional },
      { campo: 'lancamentos_fixos', rotulo: 'Lançamentos fixos', origem: 'folha', obrigatoriedade: opcional },
    ],
  },
  {
    titulo: 'Fechamento da folha',
    campos: [
      { campo: 'possui_folha', rotulo: 'Possui folha', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'responsavel_fechamento_folha', rotulo: 'Responsável pelo fechamento', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'folha_rotina_automatica', rotulo: 'Gera folha via rotina automática', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'codigo_rotina_automatica', rotulo: 'Código da rotina automática', origem: 'folha', obrigatoriedade: seSim('folha_rotina_automatica') },
      { campo: 'apura_ponto_escritorio', rotulo: 'Apura o ponto pelo escritório', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'realiza_lancamentos', rotulo: 'Realiza lançamentos', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'observacoes_folha', rotulo: 'Informações importantes no fechamento', origem: 'folha', obrigatoriedade: opcional },
      { campo: 'data_meta_entrega_folha', rotulo: 'Meta de entrega da folha', origem: 'folha', obrigatoriedade: opcional },
    ],
  },
  {
    titulo: 'Informações sindicais',
    // A lista de sindicatos é tabela à parte; não entra na completude escalar.
    campos: [],
  },
  {
    titulo: 'Informações sobre SST',
    campos: [
      { campo: 'possui_laudos_sst', rotulo: 'Possui laudo de SST', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'empresa_responsavel_sst', rotulo: 'Empresa responsável pelo laudo', origem: 'folha', obrigatoriedade: seSim('possui_laudos_sst') },
      { campo: 'data_vencimento_laudo_situacao', rotulo: 'Situação do vencimento do laudo', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'data_vencimento_laudo', rotulo: 'Vencimento do laudo', origem: 'folha', obrigatoriedade: seDataInformada('data_vencimento_laudo_situacao') },
      { campo: 'termo_ciencia_sst', rotulo: 'Termo de responsabilidade', origem: 'folha', obrigatoriedade: obrigatorio },
    ],
  },
  {
    titulo: 'Forma de envio dos documentos',
    campos: [
      { campo: 'envio_meio', rotulo: 'Forma de envio', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'envio_documento', rotulo: 'Documento', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'envio_contato', rotulo: 'Contato', origem: 'folha', obrigatoriedade: obrigatorio },
    ],
  },
  {
    titulo: 'Dados de contribuintes individuais',
    campos: [
      { campo: 'inss_nit', rotulo: 'NIT', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'inss_tipo_segurado', rotulo: 'Tipo de segurado', origem: 'folha', obrigatoriedade: opcional },
      { campo: 'inss_opcao_recolhimento', rotulo: 'Opção de recolhimento', origem: 'folha', obrigatoriedade: opcional },
      // Derivados do par acima — nunca digitados, logo nunca cobrados.
      { campo: 'inss_codigo_recolhimento', rotulo: 'Código de recolhimento', origem: 'folha', obrigatoriedade: opcional },
      { campo: 'inss_aliquota', rotulo: 'Alíquota', origem: 'folha', obrigatoriedade: opcional },
      { campo: 'inss_salario_contribuicao', rotulo: 'Salário de contribuição', origem: 'folha', obrigatoriedade: opcional },
    ],
  },
  {
    titulo: 'Procurações',
    campos: [
      { campo: 'venc_procuracao_rfb_situacao', rotulo: 'Situação da procuração RFB', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'venc_procuracao_rfb', rotulo: 'Vencimento da procuração RFB', origem: 'folha', obrigatoriedade: seDataInformada('venc_procuracao_rfb_situacao') },
      { campo: 'venc_procuracao_det_fgts_situacao', rotulo: 'Situação da procuração DET/FGTS', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'venc_procuracao_det_fgts', rotulo: 'Vencimento da procuração DET/FGTS', origem: 'folha', obrigatoriedade: seDataInformada('venc_procuracao_det_fgts_situacao') },
      { campo: 'venc_procuracao_econsignado_situacao', rotulo: 'Situação da procuração e-Consignado', origem: 'folha', obrigatoriedade: obrigatorio },
      { campo: 'venc_procuracao_econsignado', rotulo: 'Vencimento da procuração e-Consignado', origem: 'folha', obrigatoriedade: seDataInformada('venc_procuracao_econsignado_situacao') },
      { campo: 'emails_notificacao_det', rotulo: 'E-mails que recebem o DET', origem: 'folha', obrigatoriedade: obrigatorio },
    ],
  },
  {
    titulo: 'Dados do empregador doméstico',
    // Só credenciais (tabela à parte).
    campos: [],
  },
  { titulo: 'Senhas', campos: [] },
];

// ------------------------------------------- visibilidade por tipo de cliente

/** Tipos que não usam contribuintes individuais nem empregador doméstico. */
const TIPOS_EMPRESA = ['Empresa normal', 'MEI', 'Associação'];
const OCULTOS_EMPRESA = ['Dados de contribuintes individuais', 'Dados do empregador doméstico'];

/** Tipos que usam apenas um subconjunto enxuto dos quadros. */
export const QUADROS_POR_TIPO: Record<string, string[]> = {
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

/** Um quadro aparece (e é cobrado) para este tipo de cliente? */
export function quadroVisivel(quadro: string, tipoCliente: string | null | undefined): boolean {
  const tipo = (tipoCliente ?? '').trim();
  if (!tipo) return true; // sem tipo definido, mostra tudo
  if (TIPOS_EMPRESA.includes(tipo)) return !OCULTOS_EMPRESA.includes(quadro);
  const permitidos = QUADROS_POR_TIPO[tipo];
  return permitidos ? permitidos.includes(quadro) : true;
}

// ------------------------------------------------------------- completude

const vazio = (v: unknown): boolean =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

/**
 * Campos que faltam numa ficha, considerando o tipo do cliente e as
 * dependências entre campos. Um campo só é cobrado quando:
 *   - o quadro dele aparece para o tipo do cliente;
 *   - ele é obrigatório (ou condicional com a dependência satisfeita);
 *   - está vazio.
 */
export function camposFaltantes(ficha: Record<string, unknown>): CampoFicha[] {
  const tipo = ficha.tipo_cliente as string | null;
  const faltantes: CampoFicha[] = [];

  for (const quadro of QUADROS) {
    if (!quadroVisivel(quadro.titulo, tipo)) continue;

    for (const campo of quadro.campos) {
      const regra = campo.obrigatoriedade;
      if (regra.tipo === 'opcional') continue;
      if (regra.tipo === 'condicional') {
        const gatilho = ficha[regra.dependeDe];
        if (!regra.valores.includes(String(gatilho ?? ''))) continue;
      }
      if (vazio(ficha[campo.campo])) faltantes.push(campo);
    }
  }

  return faltantes;
}

/** Todos os campos escalares referenciados — usado para montar o SELECT. */
export const TODOS_CAMPOS = QUADROS.flatMap((q) => q.campos);
