import { sql } from 'kysely';
import { db } from '../../db/index.js';
import { camposFaltantes } from '../relatorios/relatorios.repository.js';

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
  categoria: 'procuracao' | 'laudo';
  tipo: string; // ex.: 'Procuração RFB', 'Laudo SST'
  data: string; // YYYY-MM-DD
  dias: number; // dias até o vencimento (negativo = vencido)
  registro_id: string; // cliente_id
  registro_codigo: number | null;
  registro_nome: string;
  destino: 'cliente';
}

/** Considera vencimentos já vencidos ou que vencem nos próximos 90 dias. */
const dentroDaJanela = (dias: number) => dias <= 90;

async function getVencimentos(): Promise<Vencimento[]> {
  const itens: Vencimento[] = [];

  // ----- Procurações + laudo SST (por cliente; dados em cliente_folha) -----
  const clientes = await db
    .selectFrom('clientes')
    .innerJoin('cliente_folha', 'cliente_folha.cliente_id', 'clientes.id')
    .select([
      'clientes.id',
      'clientes.codigo',
      'clientes.nome',
      'cliente_folha.venc_procuracao_rfb',
      'cliente_folha.venc_procuracao_det_fgts',
      'cliente_folha.venc_procuracao_econsignado',
      'cliente_folha.data_vencimento_laudo',
    ])
    .where((eb) =>
      eb.or([
        eb('cliente_folha.venc_procuracao_rfb', 'is not', null),
        eb('cliente_folha.venc_procuracao_det_fgts', 'is not', null),
        eb('cliente_folha.venc_procuracao_econsignado', 'is not', null),
        eb('cliente_folha.data_vencimento_laudo', 'is not', null),
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

  // Mais urgentes primeiro (menor nº de dias).
  return itens.sort((a, b) => a.dias - b.dias);
}

async function getKpis(vencimentos: Vencimento[]) {
  const clientes = await db
    .selectFrom('clientes')
    .select((eb) => [
      eb.fn.countAll().as('total'),
      eb.fn
        .sum(sql<number>`case when clientes.situacao ilike 'ativ%' then 1 else 0 end`)
        .as('ativos'),
    ])
    .executeTakeFirst();

  return {
    clientes_total: n(clientes?.total),
    clientes_ativos: n(clientes?.ativos),
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

  const [por_responsavel, por_regime, por_situacao] = await Promise.all([
    porColuna('responsavel'),
    porColuna('regime_tributacao'),
    porColuna('situacao'),
  ]);

  return { por_responsavel, por_regime, por_situacao };
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

export interface ClienteIncompleto {
  id: string;
  codigo: number;
  nome: string;
  faltantes: string[];
}

/** Empresas com cadastro incompleto (campos essenciais em branco). */
async function getIncompletos(): Promise<ClienteIncompleto[]> {
  const rows = await db
    .selectFrom('clientes')
    .leftJoin('cliente_folha', 'cliente_folha.cliente_id', 'clientes.id')
    .select([
      'clientes.id',
      'clientes.codigo',
      'clientes.nome',
      'clientes.cnpj',
      'clientes.tipo_cliente',
      'clientes.regime_tributacao',
      'clientes.responsavel',
      'cliente_folha.possui_folha',
      'cliente_folha.forma_pagamento_salarios',
      'cliente_folha.responsavel_fechamento_folha',
    ])
    .orderBy('clientes.nome')
    .execute();

  return rows
    .map((r) => ({ id: r.id, codigo: r.codigo, nome: r.nome, faltantes: camposFaltantes(r) }))
    .filter((r) => r.faltantes.length > 0);
}

export interface EventoProximo {
  id: string;
  cliente_id: string;
  codigo: number;
  nome: string;
  colaborador: string | null;
  descricao: string | null;
  competencia: string;
  meses: number; // diferença em meses até a competência (0 = mês atual, <0 = passado)
}

/** Diferença em meses entre a competência 'YYYY-MM-DD' e o mês atual. */
function mesesAte(competencia: string): number {
  const hoje = new Date();
  const [y, m] = competencia.slice(0, 10).split('-').map(Number);
  return (y - hoje.getFullYear()) * 12 + (m - 1 - hoje.getMonth());
}

/**
 * Eventos futuros "a lançar" cuja competência é o mês atual, já passou (atrasado)
 * ou está próxima (até 2 meses à frente). A competência é um mês de referência,
 * então a proximidade é medida em meses, não em dias.
 */
async function getEventosProximos(): Promise<EventoProximo[]> {
  const rows = await db
    .selectFrom('eventos_futuros')
    .innerJoin('clientes', 'clientes.id', 'eventos_futuros.cliente_id')
    .select([
      'eventos_futuros.id',
      'eventos_futuros.cliente_id',
      'clientes.codigo',
      'clientes.nome',
      'eventos_futuros.colaborador_nome',
      'eventos_futuros.descricao',
      'eventos_futuros.competencia',
    ])
    .where('eventos_futuros.situacao', '=', 'A lançar')
    .execute();

  return rows
    .map((r) => ({
      id: r.id,
      cliente_id: r.cliente_id,
      codigo: r.codigo,
      nome: r.nome,
      colaborador: r.colaborador_nome,
      descricao: r.descricao,
      competencia: r.competencia,
      meses: mesesAte(r.competencia),
    }))
    .filter((e) => e.meses <= 2)
    .sort((a, b) => a.meses - b.meses);
}

export async function getDashboard() {
  const vencimentos = await getVencimentos();
  const [kpis, composicao, atividade, incompletos, eventos] = await Promise.all([
    getKpis(vencimentos),
    getComposicao(),
    getAtividade(),
    getIncompletos(),
    getEventosProximos(),
  ]);
  return { kpis, vencimentos, composicao, atividade, incompletos, eventos };
}
