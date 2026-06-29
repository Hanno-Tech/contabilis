import { sql } from 'kysely';
import { db } from '../../db/index.js';

/**
 * Métricas da tela inicial (dashboard). Tudo derivado dos dados já existentes:
 * clientes, convenções e a trilha de auditoria.
 */

const n = (v: unknown): number => Number(v ?? 0);

/** Dias entre hoje (00:00) e uma data 'YYYY-MM-DD'. Negativo = já venceu. */
function diasAte(dateStr: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  const due = new Date(y, m - 1, d);
  return Math.round((due.getTime() - hoje.getTime()) / 86_400_000);
}

export interface Vencimento {
  categoria: 'procuracao' | 'laudo' | 'convencao';
  tipo: string; // ex.: 'Procuração RFB', 'Laudo SST', 'Convenção'
  data: string; // YYYY-MM-DD
  dias: number; // dias até o vencimento (negativo = vencido)
  registro_id: string; // cliente_id ou convencao_id
  registro_codigo: number | null;
  registro_nome: string;
  destino: 'cliente' | 'convencao';
}

/** Considera vencimentos já vencidos ou que vencem nos próximos 90 dias. */
const dentroDaJanela = (dias: number) => dias <= 90;

async function getVencimentos(): Promise<Vencimento[]> {
  const itens: Vencimento[] = [];

  // ----- Procurações + laudo SST (por cliente) -----
  const clientes = await db
    .selectFrom('clientes')
    .select([
      'id',
      'codigo',
      'nome',
      'venc_procuracao_rfb',
      'venc_procuracao_det_fgts',
      'venc_procuracao_econsignado',
      'data_vencimento_laudo',
    ])
    .where((eb) =>
      eb.or([
        eb('venc_procuracao_rfb', 'is not', null),
        eb('venc_procuracao_det_fgts', 'is not', null),
        eb('venc_procuracao_econsignado', 'is not', null),
        eb('data_vencimento_laudo', 'is not', null),
      ]),
    )
    .execute();

  const procFields: Array<[keyof (typeof clientes)[number], string]> = [
    ['venc_procuracao_rfb', 'Procuração RFB'],
    ['venc_procuracao_det_fgts', 'Procuração DET/FGTS'],
    ['venc_procuracao_econsignado', 'Procuração e-Consignado'],
  ];

  for (const c of clientes) {
    for (const [field, tipo] of procFields) {
      const data = c[field] as string | null;
      if (!data) continue;
      const dias = diasAte(data);
      if (!dentroDaJanela(dias)) continue;
      itens.push({
        categoria: 'procuracao',
        tipo,
        data,
        dias,
        registro_id: c.id,
        registro_codigo: c.codigo,
        registro_nome: c.nome,
        destino: 'cliente',
      });
    }
    if (c.data_vencimento_laudo) {
      const dias = diasAte(c.data_vencimento_laudo);
      if (dentroDaJanela(dias)) {
        itens.push({
          categoria: 'laudo',
          tipo: 'Laudo SST',
          data: c.data_vencimento_laudo,
          dias,
          registro_id: c.id,
          registro_codigo: c.codigo,
          registro_nome: c.nome,
          destino: 'cliente',
        });
      }
    }
  }

  // ----- Convenções a expirar -----
  const convencoes = await db
    .selectFrom('convencoes')
    .select(['id', 'apelido', 'data_expiracao', 'vigencia_fim'])
    .execute();
  for (const cv of convencoes) {
    const data = cv.data_expiracao ?? cv.vigencia_fim;
    if (!data) continue;
    const dias = diasAte(data);
    if (!dentroDaJanela(dias)) continue;
    itens.push({
      categoria: 'convencao',
      tipo: 'Convenção',
      data,
      dias,
      registro_id: cv.id,
      registro_codigo: null,
      registro_nome: cv.apelido,
      destino: 'convencao',
    });
  }

  // Mais urgentes primeiro (menor nº de dias).
  return itens.sort((a, b) => a.dias - b.dias);
}

async function getKpis(vencimentos: Vencimento[]) {
  const clientes = await db
    .selectFrom('clientes')
    .select((eb) => [
      eb.fn.countAll().as('total'),
      eb.fn
        .sum(sql<number>`case when situacao ilike 'ativ%' then 1 else 0 end`)
        .as('ativos'),
      eb.fn
        .sum(sql<number>`case when convencao_id is null then 1 else 0 end`)
        .as('sem_convencao'),
    ])
    .executeTakeFirst();

  const convencoes = await db
    .selectFrom('convencoes')
    .select((eb) => [
      eb.fn.countAll().as('total'),
      eb.fn
        .sum(sql<number>`case when situacao ilike 'vigente' then 1 else 0 end`)
        .as('vigentes'),
      eb.fn
        .sum(sql<number>`case when situacao ilike 'expir%' then 1 else 0 end`)
        .as('expiradas'),
    ])
    .executeTakeFirst();

  return {
    clientes_total: n(clientes?.total),
    clientes_ativos: n(clientes?.ativos),
    clientes_sem_convencao: n(clientes?.sem_convencao),
    convencoes_total: n(convencoes?.total),
    convencoes_vigentes: n(convencoes?.vigentes),
    convencoes_expiradas: n(convencoes?.expiradas),
    // Urgência derivada do bloco de vencimentos.
    vencimentos_vencidos: vencimentos.filter((v) => v.dias < 0).length,
    vencimentos_30: vencimentos.filter((v) => v.dias >= 0 && v.dias <= 30).length,
  };
}

async function getComposicao() {
  const porColuna = async (col: 'responsavel' | 'regime_tributacao' | 'situacao') => {
    const rows = await db
      .selectFrom('clientes')
      .select((eb) => [col, eb.fn.countAll().as('total')])
      .where(col, 'is not', null)
      .where(col, '!=', '')
      .groupBy(col)
      .orderBy('total', 'desc')
      .execute();
    return rows.map((r) => ({ label: String(r[col]), total: n(r.total) }));
  };

  const topConvencoes = await db
    .selectFrom('clientes')
    .innerJoin('convencoes', 'convencoes.id', 'clientes.convencao_id')
    .select((eb) => ['convencoes.apelido as label', eb.fn.countAll().as('total')])
    .groupBy('convencoes.apelido')
    .orderBy('total', 'desc')
    .limit(8)
    .execute();

  const [por_responsavel, por_regime, por_situacao] = await Promise.all([
    porColuna('responsavel'),
    porColuna('regime_tributacao'),
    porColuna('situacao'),
  ]);

  return {
    por_responsavel,
    por_regime,
    por_situacao,
    top_convencoes: topConvencoes.map((r) => ({ label: r.label, total: n(r.total) })),
  };
}

async function getAtividade() {
  const desde = async (dias: number) => {
    const corte = new Date(Date.now() - dias * 86_400_000);
    const row = await db
      .selectFrom('alteracoes')
      .select((eb) => eb.fn.countAll().as('total'))
      .where(sql<boolean>`created_at >= ${corte}`)
      .executeTakeFirst();
    return n(row?.total);
  };

  const [ultimos_7, ultimos_30, recentes] = await Promise.all([
    desde(7),
    desde(30),
    db
      .selectFrom('alteracoes')
      .select([
        'id',
        'entidade',
        'entidade_id',
        'entidade_label',
        'acao',
        'usuario_nome',
        'alteracoes',
        'created_at',
      ])
      .orderBy('created_at', 'desc')
      .limit(6)
      .execute(),
  ]);

  return { ultimos_7, ultimos_30, recentes };
}

export async function getDashboard() {
  const vencimentos = await getVencimentos();
  const [kpis, composicao, atividade] = await Promise.all([
    getKpis(vencimentos),
    getComposicao(),
    getAtividade(),
  ]);
  return { kpis, vencimentos, composicao, atividade };
}
