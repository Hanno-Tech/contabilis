import { db } from '../../db/index.js';
import { TODOS_CAMPOS, camposFaltantes } from '../clientes/ficha.rules.js';

/**
 * Relatórios do Setor Pessoal. Todos devolvem o mesmo formato uniforme
 * (`Relatorio`) para que o frontend renderize a tabela e exporte para Excel de
 * forma genérica.
 */

export interface Coluna {
  key: string;
  label: string;
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

const vazio = (v: unknown) => v === null || v === undefined || String(v).trim() === '';

// ---------------------------------------------------- Completude do cadastro

/** Consulta base: clientes com os dados de folha. */
function clientesComFolha() {
  return db
    .selectFrom('clientes')
    .leftJoin('cliente_folha', 'cliente_folha.cliente_id', 'clientes.id');
}

// --------------------------------------------------------------- Procurações

const PROCURACOES: Array<{ campo: string; tipo: string }> = [
  // `venc_procuracao_det` e `venc_procuracao_fgts` ficaram de fora: são colunas
  // órfãs, nunca preenchidas. A planilha do setor trata DET e FGTS Digital como
  // uma procuração só, que é o que a ficha edita.
  { campo: 'venc_procuracao_rfb', tipo: 'RFB' },
  { campo: 'venc_procuracao_det_fgts', tipo: 'DET/FGTS' },
  { campo: 'venc_procuracao_econsignado', tipo: 'e-Consignado' },
];

// ================================================================ Relatórios

/** 1 — Fechamento da folha (versão completa). Apenas clientes com folha. */
export async function relFechamentoFolha(): Promise<Relatorio> {
  const rows = await clientesComFolha()
    .select([
      'clientes.codigo',
      'clientes.nome',
      'clientes.situacao',
      'cliente_folha.responsavel_fechamento_folha',
      'cliente_folha.data_meta_entrega_folha',
      'cliente_folha.prazo_envio_folhas',
      'cliente_folha.forma_pagamento_salarios',
      'cliente_folha.convencao_aplicavel_nome as convencao',
      'cliente_folha.venc_procuracao_rfb',
      'cliente_folha.venc_procuracao_det',
      'cliente_folha.venc_procuracao_det_fgts',
      'cliente_folha.venc_procuracao_fgts',
      'cliente_folha.venc_procuracao_econsignado',
      'cliente_folha.data_vencimento_laudo',
    ])
    // "Com folha": campo preenchido e que não seja uma negação ("Não possui...").
    .where('cliente_folha.possui_folha', 'is not', null)
    .where('cliente_folha.possui_folha', '!=', '')
    .where('cliente_folha.possui_folha', 'not ilike', 'não%')
    .where('cliente_folha.possui_folha', 'not ilike', 'nao%')
    .orderBy('clientes.nome')
    .execute();

  const linhas = rows.map((r) => {
    // Procurações vencidas ou vencendo em até 90 dias.
    const procs = PROCURACOES.map(({ campo, tipo }) => {
      const data = (r as unknown as Record<string, string | null>)[campo];
      if (!data || diasAte(data) > 90) return null;
      return `${tipo}: ${fmtData(data)}`;
    }).filter(Boolean);
    const laudo =
      r.data_vencimento_laudo && diasAte(r.data_vencimento_laudo) <= 90
        ? fmtData(r.data_vencimento_laudo)
        : '';
    return {
      codigo: r.codigo,
      nome: r.nome,
      situacao: r.situacao,
      responsavel_fechamento: r.responsavel_fechamento_folha ?? '',
      meta_entrega: r.data_meta_entrega_folha ?? '',
      prazo_envio: r.prazo_envio_folhas ?? '',
      forma_pagamento: r.forma_pagamento_salarios ?? '',
      convencao: r.convencao ?? '',
      procuracoes: procs.join(' · '),
      laudo_sst: laudo,
    };
  });

  return {
    titulo: 'Relatório para fechamento da folha',
    colunas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nome', label: 'Cliente' },
      { key: 'situacao', label: 'Situação' },
      { key: 'responsavel_fechamento', label: 'Responsável fechamento' },
      { key: 'meta_entrega', label: 'Meta de entrega' },
      { key: 'prazo_envio', label: 'Prazo de envio' },
      { key: 'forma_pagamento', label: 'Forma de pagamento' },
      { key: 'convencao', label: 'Convenção' },
      { key: 'procuracoes', label: 'Procurações vencendo' },
      { key: 'laudo_sst', label: 'Laudo SST vencendo' },
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

/** 3 — Procurações vencidas (uma linha por procuração com data no passado). */
export async function relProcuracoesVencidas(): Promise<Relatorio> {
  const rows = await clientesComFolha()
    .select([
      'clientes.codigo',
      'clientes.nome',
      'cliente_folha.venc_procuracao_rfb',
      'cliente_folha.venc_procuracao_det',
      'cliente_folha.venc_procuracao_det_fgts',
      'cliente_folha.venc_procuracao_fgts',
      'cliente_folha.venc_procuracao_econsignado',
    ])
    .execute();

  const linhas: Relatorio['linhas'] = [];
  for (const r of rows) {
    for (const { campo, tipo } of PROCURACOES) {
      const data = (r as unknown as Record<string, string | null>)[campo];
      if (!data || diasAte(data) >= 0) continue; // só vencidas
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

/** 6 — Pendências em aberto. */
export async function relPendenciasAbertas(): Promise<Relatorio> {
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

/** 7 — Eventos futuros a lançar. */
export async function relEventosALancar(): Promise<Relatorio> {
  const rows = await db
    .selectFrom('eventos_futuros')
    .innerJoin('clientes', 'clientes.id', 'eventos_futuros.cliente_id')
    .select([
      'clientes.codigo',
      'clientes.nome',
      'eventos_futuros.created_at',
      'eventos_futuros.competencia',
      'eventos_futuros.colaborador_nome',
    ])
    .where('eventos_futuros.situacao', '=', 'A lançar')
    .orderBy('eventos_futuros.competencia')
    .execute();

  return {
    titulo: 'Relatório de eventos futuros a lançar',
    colunas: [
      { key: 'codigo', label: 'Código' },
      { key: 'nome', label: 'Cliente' },
      { key: 'colaborador', label: 'Colaborador' },
      { key: 'data_cadastro', label: 'Data do cadastro' },
      { key: 'competencia', label: 'Competência do lançamento' },
    ],
    linhas: rows.map((r) => ({
      codigo: r.codigo,
      nome: r.nome,
      colaborador: r.colaborador_nome ?? '',
      data_cadastro: fmtData(
        r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      ),
      competencia: fmtCompetencia(r.competencia),
    })),
  };
}
