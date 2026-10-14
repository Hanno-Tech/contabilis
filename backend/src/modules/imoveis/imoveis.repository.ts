import { sql } from 'kysely';
import { db } from '../../db/index.js';
import {
  CAMPOS_IMOVEL,
  CAMPOS_IMOVEL_NUMERICOS,
} from '../contabil/contabil.campos.js';
import type { ImovelInput } from './imoveis.schema.js';

export interface ImovelFilters {
  q?: string;
  cliente_id?: string;
  tipo?: string;
  situacao?: string;
  forma_aquisicao?: string;
}

const COLUNAS = CAMPOS_IMOVEL.map((c) => c.key);

/** Colunas escalares do imóvel a partir da entrada validada. */
function mainColumns(input: ImovelInput) {
  const cols: Record<string, unknown> = { cliente_id: input.cliente_id, situacao: input.situacao };
  for (const key of COLUNAS) {
    if (key === 'situacao') continue;
    const valor = input[key];
    if (valor === undefined || valor === null || valor === '') cols[key] = null;
    else cols[key] = CAMPOS_IMOVEL_NUMERICOS.has(key) ? String(valor) : valor;
  }
  return cols;
}

const withCliente = () =>
  db
    .selectFrom('imoveis')
    .innerJoin('clientes', 'clientes.id', 'imoveis.cliente_id')
    .select([
      'imoveis.id',
      'imoveis.cliente_id',
      'imoveis.numero_ordem',
      ...COLUNAS.map((c) => `imoveis.${c}` as const),
      'imoveis.version',
      'imoveis.created_at',
      'imoveis.updated_at',
      'clientes.codigo as cliente_codigo',
      'clientes.nome as cliente_nome',
    ]);

export async function listImoveis(filters: ImovelFilters) {
  let query = withCliente();

  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    query = query.where((eb) =>
      eb.or([
        eb('clientes.nome', 'ilike', term),
        eb('imoveis.matricula', 'ilike', term),
        eb('imoveis.municipio', 'ilike', term),
        eb('imoveis.loteamento', 'ilike', term),
        eb('imoveis.codigo_prefeitura', 'ilike', term),
        eb('imoveis.cib', 'ilike', term),
        eb(sql`clientes.codigo::text`, 'ilike', term),
      ]),
    );
  }
  if (filters.cliente_id) query = query.where('imoveis.cliente_id', '=', filters.cliente_id);
  if (filters.tipo) query = query.where('imoveis.tipo', '=', filters.tipo);
  if (filters.situacao) query = query.where('imoveis.situacao', '=', filters.situacao);
  if (filters.forma_aquisicao)
    query = query.where('imoveis.forma_aquisicao', '=', filters.forma_aquisicao);

  return query.orderBy('clientes.nome').orderBy('imoveis.numero_ordem').execute();
}

export async function getImovel(id: string) {
  return withCliente().where('imoveis.id', '=', id).executeTakeFirst();
}

/** Próximo número de ordem livre do cliente. */
async function proximoNumero(clienteId: string): Promise<number> {
  const row = await db
    .selectFrom('imoveis')
    .select((eb) => eb.fn.max('numero_ordem').as('max'))
    .where('cliente_id', '=', clienteId)
    .executeTakeFirst();
  return Number(row?.max ?? 0) + 1;
}

/** Já existe outro imóvel do cliente com esse número de ordem? */
export async function numeroEmUso(
  clienteId: string,
  numero: number,
  ignorarId?: string,
): Promise<boolean> {
  let query = db
    .selectFrom('imoveis')
    .select('id')
    .where('cliente_id', '=', clienteId)
    .where('numero_ordem', '=', numero);
  if (ignorarId) query = query.where('id', '!=', ignorarId);
  return !!(await query.executeTakeFirst());
}

export async function createImovel(input: ImovelInput): Promise<string> {
  const numero = input.numero_ordem ?? (await proximoNumero(input.cliente_id));
  const row = await db
    .insertInto('imoveis')
    .values({ ...mainColumns(input), numero_ordem: numero } as never)
    .returning('id')
    .executeTakeFirstOrThrow();
  return row.id;
}

export async function updateImovel(
  id: string,
  expectedVersion: number,
  input: ImovelInput,
  numeroAtual: number,
): Promise<number | null> {
  const updated = await db
    .updateTable('imoveis')
    .set({
      ...mainColumns(input),
      numero_ordem: input.numero_ordem ?? numeroAtual,
      version: expectedVersion + 1,
    } as never)
    .where('id', '=', id)
    .where('version', '=', expectedVersion)
    .returning('version')
    .executeTakeFirst();
  return updated?.version ?? null; // null = conflito de versão
}

export async function deleteImovel(id: string): Promise<boolean> {
  const res = await db.deleteFrom('imoveis').where('id', '=', id).executeTakeFirst();
  return Number(res.numDeletedRows) > 0;
}
