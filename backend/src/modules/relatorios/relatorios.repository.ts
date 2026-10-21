import { db } from '../../db/index.js';
import type { Setor } from '../../db/types.js';
import { PROCURACAO_ATIVA, TODOS_CAMPOS, camposFaltantes } from '../clientes/ficha.rules.js';

/**
 * Relatórios dos setores pessoal e contábil. Todos devolvem o mesmo formato uniforme
 * (`Relatorio`) para que o frontend renderize a tabela e exporte para Excel de
 * forma genérica.
 */

export interface Coluna {
  key: string;
  label: string;
  /** Cabeçalho que agrupa colunas vizinhas (como as células mescladas da planilha). */
  grupo?: string;
}

export interface Relatorio {
  titulo: string;
  colunas: Coluna[];
  linhas: Record<string, string | number | null>[];
}

// ------------------------------------------------------------------- Helpers

/** 'YYYY-MM-DD' -> 'DD/MM/AAAA' (ou '' se vazio). */
function fmtData(value: string | null | undefined): string {
  if (!value) return '';
  const [y, m, d] = value.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : value;
}

/** 'YYYY-MM-DD' -> 'MM/AAAA'. */
function fmtCompetencia(value: string | null | undefined): string {
  if (!value) return '';
  const [y, m] = value.slice(0, 10).split('-');
  return y && m ? `${m}/${y}` : value;
}

/** Dias entre hoje (00:00) e uma data 'YYYY-MM-DD'. Negativo = já venceu. */
function diasAte(dateStr: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  const due = new Date(y, m - 1, d);
  return Math.round((due.getTime() - hoje.getTime()) / 86_400_000);
}

// ---------------------------------------------------- Completude do cadastro

/** Consulta base: clientes com os dados de folha. */
function clientesComFolha() {
  return db
    .selectFrom('clientes')
    .leftJoin('cliente_folha', 'cliente_folha.cliente_id', 'clientes.id');
}

// --------------------------------------------------------------- Procurações

const PROCURACOES: Array<{ campo: string; situacao: string; tipo: string }> = [
  // A procuração da RFB saiu do controle do setor. `venc_procuracao_det` e
  // `venc_procuracao_fgts` são colunas órfãs; DET e FGTS Digital são uma
  // procuração só, que é o que a ficha edita.
  { campo: 'venc_procuracao_econsignado', situacao: 'venc_procuracao_econsignado_situacao', tipo: 'e-Consignado' },
  { campo: 'venc_procuracao_det_fgts', situacao: 'venc_procuracao_det_fgts_situacao', tipo: 'DET e FGTS' },
];

// ================================================================ Relatórios

/**
 * 1 — Fechamento da folha. Espelha a planilha "Modelo fechamento": mesmas
 * colunas, na mesma ordem e com os mesmos grupos de cabeçalho.
 * Apenas clientes com folha.
 */
export async function relFechamentoFolha(): Promise<Relatorio> {
  const GERAIS = 'Informações gerais';
  const FOLHA = 'Informações relevantes para a folha de pagamento';
  const ENVIO = 'Forma de envio dos documentos';
  const INSS = 'Dados para elaboração da guia de INSS autônomo/facultativo';
  const DOMESTICO = 'Empregado doméstico';

  const rows = await clientesComFolha()
    // Credenciais do empregado doméstico: chave fixa, no máximo uma por cliente.
    .leftJoin('cliente_credenciais', (join) =>
      join
        .onRef('cliente_credenciais.cliente_id', '=', 'clientes.id')
        .on('cliente_credenciais.tipo', '=', 'empregado_domestico'),
    )
    .select([
      'clientes.codigo',
      'clientes.nome',
      'clientes.cnpj',
      'clientes.tipo_cliente',
      'clientes.regime_tributacao',
      'clientes.situacao',
      'clientes.responsavel',
      'cliente_folha.possui_folha',
      'cliente_folha.apura_ponto_escritorio',
      'cliente_folha.realiza_lancamentos',
      'cliente_folha.folha_rotina_automatica',
      'cliente_folha.codigo_rotina_automatica',
      'cliente_folha.concede_plano_saude',
      'cliente_folha.plano_operadora',
      'cliente_folha.plano_beneficiarios',
      'cliente_folha.fator_r',
      'cliente_folha.atividade_concomitante',
      'cliente_folha.construcao_civil',
      'cliente_folha.cprb',
      'cliente_folha.observacoes_folha',
      'cliente_folha.prazo_envio_folhas',
      'cliente_folha.envio_meio',
      'cliente_folha.envio_documento',
      'cliente_folha.envio_contato',
      'cliente_folha.inss_nit',
      'cliente_folha.inss_codigo_recolhimento',
      'cliente_folha.inss_salario_contribuicao',
      'cliente_folha.inss_aliquota',
      'cliente_credenciais.usuario as domestico_usuario',
      'cliente_credenciais.senha_cipher as domestico_senha_cipher',
    ])
    // "Com folha": campo preenchido e que não seja uma negação ("Não possui...").
    .where('cliente_folha.possui_folha', 'is not', null)
    .where('cliente_folha.possui_folha', '!=', '')
    .where('cliente_folha.possui_folha', 'not ilike', 'não%')
    .where('cliente_folha.possui_folha', 'not ilike', 'nao%')
    .orderBy('clientes.codigo')
    .execute();

  const linhas = rows.map((r) => ({
    codigo: r.codigo,
    nome: r.nome,
    cnpj: r.cnpj ?? '',
    tipo_cliente: r.tipo_cliente ?? '',
    regime_tributacao: r.regime_tributacao ?? '',
    situacao: r.situacao,
    responsavel: r.responsavel ?? '',
    possui_folha: r.possui_folha ?? '',
    apura_ponto: r.apura_ponto_escritorio ?? '',
    realiza_lancamentos: r.realiza_lancamentos ?? '',
    rotina_automatica: r.folha_rotina_automatica ?? '',
    codigo_rotina: r.codigo_rotina_automatica ?? '',
    plano_concede: r.concede_plano_saude ?? '',
    plano_operadora: r.plano_operadora ?? '',
    plano_beneficiarios: r.plano_beneficiarios ?? '',
    fator_r: r.fator_r ?? '',
    atividade_concomitante: r.atividade_concomitante ?? '',
    construcao_civil: r.construcao_civil ?? '',
    cprb: r.cprb ?? '',
    observacoes_folha: r.observacoes_folha ?? '',
    prazo_envio: r.prazo_envio_folhas ?? '',
    envio_meio: r.envio_meio ?? '',
    envio_documento: r.envio_documento ?? '',
    envio_contato: r.envio_contato ?? '',
    inss_nit: r.inss_nit ?? '',
    inss_codigo_recolhimento: r.inss_codigo_recolhimento ?? '',
    inss_salario_contribuicao: r.inss_salario_contribuicao ?? '',
    inss_aliquota: r.inss_aliquota ?? '',
    domestico_usuario: r.domestico_usuario ?? '',
    // RNF-02: senha nunca sai em claro — o relatório só indica se existe uma.
    domestico_senha: r.domestico_senha_cipher ? 'Cadastrada' : '',
  }));

  return {
    titulo: 'Relatório para fechamento da folha',
    colunas: [
      { key: 'codigo', label: 'Código da empresa' },
      { key: 'nome', label: 'Nome' },
      { key: 'cnpj', label: 'CNPJ', grupo: GERAIS },
      { key: 'tipo_cliente', label: 'Tipo de cliente', grupo: GERAIS },
      { key: 'regime_tributacao', label: 'Regime de tributação', grupo: GERAIS },
      { key: 'situacao', label: 'Situação', grupo: GERAIS },
      { key: 'responsavel', label: 'Responsável', grupo: GERAIS },
      { key: 'possui_folha', label: 'Possui folha de pagamento?', grupo: GERAIS },
      { key: 'apura_ponto', label: 'Apura o ponto pelo escritório?', grupo: FOLHA },
      { key: 'realiza_lancamentos', label: 'Realiza lançamentos?', grupo: FOLHA },
      { key: 'rotina_automatica', label: 'Gera folha via rotina automática?', grupo: FOLHA },
      { key: 'codigo_rotina', label: 'Código da rotina automática', grupo: FOLHA },
      { key: 'plano_concede', label: 'Concede plano de saúde?', grupo: FOLHA },
      { key: 'plano_operadora', label: 'Operadora do plano', grupo: FOLHA },
      { key: 'plano_beneficiarios', label: 'Beneficiários do plano', grupo: FOLHA },
      { key: 'fator_r', label: 'Fator "R"?', grupo: FOLHA },
      { key: 'atividade_concomitante', label: 'Atividade concomitante?', grupo: FOLHA },
      { key: 'construcao_civil', label: 'Construção civil?', grupo: FOLHA },
      { key: 'cprb', label: 'CPRB?', grupo: FOLHA },
      { key: 'observacoes_folha', label: 'Observações importantes sobre a folha' },
      { key: 'prazo_envio', label: 'Prazo para envio das folhas' },
      { key: 'envio_meio', label: 'Meio', grupo: ENVIO },
      { key: 'envio_documento', label: 'Documento', grupo: ENVIO },
      { key: 'envio_contato', label: 'Contato', grupo: ENVIO },
      { key: 'inss_nit', label: 'NIT', grupo: INSS },
      { key: 'inss_codigo_recolhimento', label: 'Código de recolhimento', grupo: INSS },
      { key: 'inss_salario_contribuicao', label: 'Salário de contribuição', grupo: INSS },
      { key: 'inss_aliquota', label: 'Alíquota', grupo: INSS },
      { key: 'domestico_usuario', label: 'Usuário', grupo: DOMESTICO },
      { key: 'domestico_senha', label: 'Senha', grupo: DOMESTICO },
    ],
    linhas,
  };
}

/** 2 — Clientes por situação. */
export async function relClientesPorSituacao(): Promise<Relatorio> {
  const rows = await db
    .selectFrom('clientes')
    .select(['codigo', 'nome', 'situacao', 'data_evento_situacao'])
    .orderBy('situacao')
    .orderBy('nome')
    .execute();

  return {
    titulo: 'Relatório de clientes por situação',
    colunas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nome', label: 'Cliente' },
      { key: 'situacao', label: 'Situação' },
      { key: 'data_situacao', label: 'Data da situação' },
    ],
    linhas: rows.map((r) => ({
      codigo: r.codigo,
      nome: r.nome,
      situacao: r.situacao,
      data_situacao: fmtData(r.data_evento_situacao),
    })),
  };
}

/** 3 — Procurações vencidas (uma linha por procuração ativa com data no passado). */
export async function relProcuracoesVencidas(): Promise<Relatorio> {
  const rows = await clientesComFolha()
    .select([
      'clientes.codigo',
      'clientes.nome',
      'cliente_folha.venc_procuracao_det_fgts',
      'cliente_folha.venc_procuracao_det_fgts_situacao',
      'cliente_folha.venc_procuracao_econsignado',
      'cliente_folha.venc_procuracao_econsignado_situacao',
    ])
    .execute();

  const linhas: Relatorio['linhas'] = [];
  for (const r of rows) {
    const reg = r as unknown as Record<string, string | null>;
    for (const { campo, situacao, tipo } of PROCURACOES) {
      const data = reg[campo];
      // Só procuração "Ativa" tem vencimento a acompanhar.
      if (!data || reg[situacao] !== PROCURACAO_ATIVA || diasAte(data) >= 0) continue;
      linhas.push({
        codigo: r.codigo,
        nome: r.nome,
        tipo,
        vencimento: fmtData(data),
        _ord: data.slice(0, 10),
      });
    }
  }
  linhas.sort((a, b) => String(a._ord).localeCompare(String(b._ord)));
  linhas.forEach((l) => delete l._ord);

  return {
    titulo: 'Relatório de procurações vencidas',
    colunas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nome', label: 'Cliente' },
      { key: 'tipo', label: 'Tipo de procuração' },
      { key: 'vencimento', label: 'Data do vencimento' },
    ],
    linhas,
  };
}

/**
 * 3b — Vencimento de procurações: uma linha por empresa, com situação, data da
 * situação e vencimento de cada procuração e os e-mails que recebem o DET.
 */
export async function relVencimentoProcuracoes(): Promise<Relatorio> {
  const rows = await clientesComFolha()
    .select([
      'clientes.codigo',
      'clientes.nome',
      'clientes.cnpj',
      'cliente_folha.venc_procuracao_econsignado',
      'cliente_folha.venc_procuracao_econsignado_situacao',
      'cliente_folha.venc_procuracao_econsignado_data_situacao',
      'cliente_folha.venc_procuracao_det_fgts',
      'cliente_folha.venc_procuracao_det_fgts_situacao',
      'cliente_folha.venc_procuracao_det_fgts_data_situacao',
      'cliente_folha.emails_notificacao_det',
    ])
    .orderBy('clientes.codigo')
    .execute();

  const CONSIGNADO = 'e-Consignado';
  const DET = 'DET e FGTS';

  return {
    titulo: 'Relatório de vencimento de procurações',
    colunas: [
      { key: 'codigo', label: 'Código da empresa' },
      { key: 'nome', label: 'Nome da empresa' },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'consig_situacao', label: 'Situação', grupo: CONSIGNADO },
      { key: 'consig_data_situacao', label: 'Data da situação', grupo: CONSIGNADO },
      { key: 'consig_vencimento', label: 'Data de vencimento', grupo: CONSIGNADO },
      { key: 'det_situacao', label: 'Situação', grupo: DET },
      { key: 'det_data_situacao', label: 'Data da situação', grupo: DET },
      { key: 'det_vencimento', label: 'Data de vencimento', grupo: DET },
      { key: 'emails_det', label: 'E-mails que recebem o DET' },
    ],
    linhas: rows.map((r) => ({
      codigo: r.codigo,
      nome: r.nome,
      cnpj: r.cnpj ?? '',
      consig_situacao: r.venc_procuracao_econsignado_situacao ?? '',
      consig_data_situacao: fmtData(r.venc_procuracao_econsignado_data_situacao),
      consig_vencimento: fmtData(r.venc_procuracao_econsignado),
      det_situacao: r.venc_procuracao_det_fgts_situacao ?? '',
      det_data_situacao: fmtData(r.venc_procuracao_det_fgts_data_situacao),
      det_vencimento: fmtData(r.venc_procuracao_det_fgts),
      emails_det: r.emails_notificacao_det ?? '',
    })),
  };
}

/**
 * 3c — Laudos de SST vencidos: empresas com a data de vencimento do laudo no
 * passado, com a empresa responsável pela elaboração. Mais atrasados primeiro.
 */
export async function relLaudosVencidos(): Promise<Relatorio> {
  const rows = await clientesComFolha()
    .select([
      'clientes.codigo',
      'clientes.nome',
      'clientes.situacao',
      'cliente_folha.empresa_responsavel_sst',
      'cliente_folha.data_vencimento_laudo',
    ])
    .where('cliente_folha.data_vencimento_laudo', 'is not', null)
    .orderBy('cliente_folha.data_vencimento_laudo')
    .execute();

  const linhas: Relatorio['linhas'] = [];
  for (const r of rows) {
    const dias = diasAte(r.data_vencimento_laudo as string);
    if (dias >= 0) continue; // só vencidos
    linhas.push({
      codigo: r.codigo,
      nome: r.nome,
      situacao: r.situacao,
      empresa_sst: r.empresa_responsavel_sst ?? '',
      vencimento: fmtData(r.data_vencimento_laudo),
      dias_atraso: -dias,
    });
  }

  return {
    titulo: 'Relatório de laudos de SST vencidos',
    colunas: [
      { key: 'codigo', label: 'Código da empresa' },
      { key: 'nome', label: 'Nome da empresa' },
      { key: 'situacao', label: 'Situação' },
      { key: 'empresa_sst', label: 'Empresa responsável pelo laudo' },
      { key: 'vencimento', label: 'Data de vencimento do laudo' },
      { key: 'dias_atraso', label: 'Dias em atraso' },
    ],
    linhas,
  };
}

/** 4 — Campos não preenchidos (clientes com pelo menos um campo essencial vazio). */
export async function relCamposNaoPreenchidos(): Promise<Relatorio> {
  // Mesma regra do painel de fichas incompletas: só cobra o que se aplica ao
  // tipo daquele cliente e cuja dependência está satisfeita.
  const camposCliente = [
    ...new Set(TODOS_CAMPOS.filter((c) => c.origem === 'cliente').map((c) => c.campo)),
  ];
  const camposFolha = [
    ...new Set(TODOS_CAMPOS.filter((c) => c.origem === 'folha').map((c) => c.campo)),
  ];

  const rows = await clientesComFolha()
    .select([
      'clientes.codigo',
      'clientes.nome',
      ...camposCliente.map((c) => `clientes.${c}` as never),
      ...camposFolha.map((c) => `cliente_folha.${c}` as never),
    ])
    .orderBy('clientes.nome')
    .execute();

  const linhas = rows
    .map((r) => ({
      codigo: (r as { codigo: number }).codigo,
      nome: (r as { nome: string }).nome,
      faltantes: camposFaltantes(r as unknown as Record<string, unknown>).map((c) => c.rotulo),
    }))
    .filter((r) => r.faltantes.length > 0)
    .map((r) => ({ codigo: r.codigo, nome: r.nome, campos: r.faltantes.join(', ') }));

  return {
    titulo: 'Relatório de campos não preenchidos',
    colunas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nome', label: 'Cliente' },
      { key: 'campos', label: 'Campos não preenchidos' },
    ],
    linhas,
  };
}

/** 5 — Clientes por regime de tributação. */
export async function relClientesPorRegime(): Promise<Relatorio> {
  const rows = await db
    .selectFrom('clientes')
    .select(['codigo', 'nome', 'regime_tributacao'])
    .orderBy('regime_tributacao')
    .orderBy('nome')
    .execute();

  return {
    titulo: 'Relatório de clientes por regime de tributação',
    colunas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nome', label: 'Cliente' },
      { key: 'regime', label: 'Regime de tributação' },
    ],
    linhas: rows.map((r) => ({
      codigo: r.codigo,
      nome: r.nome,
      regime: r.regime_tributacao ?? '',
    })),
  };
}

/** 6 — Pendências em aberto do setor. */
export async function relPendenciasAbertas(setor: Setor): Promise<Relatorio> {
  const rows = await db
    .selectFrom('pendencias')
    .innerJoin('clientes', 'clientes.id', 'pendencias.cliente_id')
    .select([
      'clientes.codigo',
      'clientes.nome',
      'pendencias.data',
      'pendencias.descricao',
      'pendencias.situacao',
    ])
    .where('pendencias.situacao', '=', 'Aberta')
    .where('pendencias.setor', '=', setor)
    .orderBy('pendencias.data', 'desc')
    .execute();

  return {
    titulo: 'Relatório de pendências em aberto',
    colunas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nome', label: 'Cliente' },
      { key: 'data', label: 'Data do cadastro' },
      { key: 'descricao', label: 'Descrição' },
      { key: 'situacao', label: 'Situação' },
    ],
    linhas: rows.map((r) => ({
      codigo: r.codigo,
      nome: r.nome,
      data: fmtData(r.data),
      descricao: r.descricao,
      situacao: r.situacao,
    })),
  };
}

/** 7 — Eventos futuros a lançar do setor. */
export async function relEventosALancar(setor: Setor): Promise<Relatorio> {
  const rows = await db
    .selectFrom('eventos_futuros')
    .innerJoin('clientes', 'clientes.id', 'eventos_futuros.cliente_id')
    .select([
      'clientes.codigo',
      'clientes.nome',
      'eventos_futuros.created_at',
      'eventos_futuros.competencia',
      'eventos_futuros.colaborador_nome',
      'eventos_futuros.descricao',
    ])
    .where('eventos_futuros.situacao', '=', 'A lançar')
    .where('eventos_futuros.setor', '=', setor)
    .orderBy('eventos_futuros.competencia')
    .execute();

  return {
    titulo: 'Relatório de eventos futuros a lançar',
    colunas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nome', label: 'Cliente' },
      // Colaborador é coisa da folha; no contábil o evento diz o que lançar.
      setor === 'pessoal'
        ? { key: 'colaborador', label: 'Colaborador' }
        : { key: 'descricao', label: 'Descrição' },
      { key: 'data_cadastro', label: 'Data do cadastro' },
      { key: 'competencia', label: 'Competência do lançamento' },
    ],
    linhas: rows.map((r) => ({
      codigo: r.codigo,
      nome: r.nome,
      colaborador: r.colaborador_nome ?? '',
      descricao: r.descricao ?? '',
      data_cadastro: fmtData(
        r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      ),
      competencia: fmtCompetencia(r.competencia),
    })),
  };
}
