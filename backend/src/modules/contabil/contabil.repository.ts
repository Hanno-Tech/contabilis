import { sql } from 'kysely';
import { db } from '../../db/index.js';
import { CAMPOS_CONTABIL } from './contabil.campos.js';
import type { ContabilInput } from './contabil.schema.js';

export interface ContabilFilters {
  q?: string;
  situacao?: string;
  responsavel?: string;
  prioridade?: string;
  grupo?: string;
  regime?: string;
}

const COLUNAS_CONTABIL = CAMPOS_CONTABIL.map((c) => c.key);

/** Clientes com os dados contábeis que a listagem mostra e filtra. */
export async function listClientesContabil(filters: ContabilFilters) {
  let query = db
    .selectFrom('clientes')
    .leftJoin('cliente_contabil', 'cliente_contabil.cliente_id', 'clientes.id')
    .select([
      'clientes.id',
      'clientes.codigo',
      'clientes.nome',
      'clientes.cnpj',
      'clientes.situacao',
      'clientes.regime_tributacao',
      'cliente_contabil.grupo_empresarial',
      'cliente_contabil.ramo_atividade',
      'cliente_contabil.responsavel',
      'cliente_contabil.prioridade',
    ]);

  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    query = query.where((eb) =>
      eb.or([
        eb('clientes.nome', 'ilike', term),
        eb('clientes.cnpj', 'ilike', term),
        eb(sql`clientes.codigo::text`, 'ilike', term),
        eb('cliente_contabil.grupo_empresarial', 'ilike', term),
      ]),
    );
  }
  if (filters.situacao) query = query.where('clientes.situacao', '=', filters.situacao);
  if (filters.regime) query = query.where('clientes.regime_tributacao', '=', filters.regime);
  if (filters.responsavel)
    query = query.where('cliente_contabil.responsavel', '=', filters.responsavel);
  if (filters.prioridade) query = query.where('cliente_contabil.prioridade', '=', filters.prioridade);
  if (filters.grupo) query = query.where('cliente_contabil.grupo_empresarial', '=', filters.grupo);

  return query.orderBy('clientes.nome').execute();
}

/** Valores distintos para os filtros da listagem. */
export async function listFiltrosContabil() {
  const distinct = async (col: 'responsavel' | 'prioridade' | 'grupo_empresarial') => {
    const rows = await db
      .selectFrom('cliente_contabil')
      .select(col)
      .distinct()
      .where(col, 'is not', null)
      .orderBy(col)
      .execute();
    return rows.map((r) => r[col]).filter((v): v is string => !!v);
  };
  const [responsaveis, prioridades, grupos] = await Promise.all([
    distinct('responsavel'),
    distinct('prioridade'),
    distinct('grupo_empresarial'),
  ]);
  return { responsaveis, prioridades, grupos };
}

/** Cadastro geral do cliente + ficha contábil. */
export async function getFichaContabil(id: string) {
  const cliente = await db
    .selectFrom('clientes')
    .select([
      'id',
      'codigo',
      'nome',
      'cnpj',
      'tipo_cliente',
      'regime_tributacao',
      'situacao',
      'data_evento_situacao',
    ])
    .where('id', '=', id)
    .executeTakeFirst();
  if (!cliente) return null;

  const contabil = await db
    .selectFrom('cliente_contabil')
    .select([...COLUNAS_CONTABIL, 'version'])
    .where('cliente_id', '=', id)
    .executeTakeFirst();

  // Cliente cadastrado depois da migration ainda não tem a linha: a ficha
  // aparece vazia, na versão 1 — a mesma que a linha recebe ao ser criada.
  return { ...cliente, contabil: contabil ?? null };
}

/** Só as colunas que vieram no payload (UPDATE parcial, como a ficha do DP). */
function contabilColumns(input: ContabilInput): Record<string, string | null> {
  const cols: Record<string, string | null> = {};
  for (const key of COLUNAS_CONTABIL) {
    const valor = input[key];
    if (valor === undefined) continue;
    cols[key] = valor === null || valor === '' ? null : valor;
  }
  return cols;
}

export async function updateContabil(
  clienteId: string,
  expectedVersion: number,
  input: ContabilInput,
): Promise<number | null> {
  return db.transaction().execute(async (trx) => {
    // Clientes criados depois da migration não têm a linha 1:1 ainda.
    await trx
      .insertInto('cliente_contabil')
      .values({ cliente_id: clienteId })
      .onConflict((oc) => oc.column('cliente_id').doNothing())
      .execute();
    const updated = await trx
      .updateTable('cliente_contabil')
      .set({ ...contabilColumns(input), version: expectedVersion + 1 })
      .where('cliente_id', '=', clienteId)
      .where('version', '=', expectedVersion)
      .returning('version')
      .executeTakeFirst();
    return updated?.version ?? null; // null = conflito de versão
  });
}
