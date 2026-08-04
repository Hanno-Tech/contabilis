import { sql } from 'kysely';
import { db } from '../../db/index.js';
import type { EntidadeInput } from './entidades.schema.js';

const baseQuery = () =>
  db
    .selectFrom('entidades')
    .select([
      'id',
      'tipo',
      'codigo',
      'nome',
      'cnpj',
      'contato',
      'ativo',
      'version',
      'created_at',
      'updated_at',
    ]);

export async function listEntidades(filtros: { q?: string; tipo?: string }) {
  let query = baseQuery();

  if (filtros.tipo) query = query.where('tipo', '=', filtros.tipo);

  if (filtros.q) {
    const term = `%${filtros.q.trim()}%`;
    query = query.where((eb) =>
      eb.or([
        eb('nome', 'ilike', term),
        eb('codigo', 'ilike', term),
        eb('cnpj', 'ilike', term),
        eb('contato', 'ilike', term),
      ]),
    );
  }

  return query.orderBy('tipo').orderBy('nome').execute();
}

export async function getEntidade(id: string) {
  return baseQuery().where('id', '=', id).executeTakeFirst();
}

/**
 * Nome já usado dentro do mesmo tipo? O índice único também barra, mas o erro
 * do Postgres chega como 409 — o mesmo status do conflito de versão —, o que
 * faria a tela dizer "alterado por outro usuário". Checar antes permite uma
 * mensagem que descreve o problema real.
 */
export async function nomeEmUso(
  tipo: string,
  nome: string,
  ignorarId?: string,
): Promise<boolean> {
  let query = db
    .selectFrom('entidades')
    .select('id')
    .where('tipo', '=', tipo)
    .where(sql<boolean>`lower(nome) = lower(${nome.trim()})`);
  if (ignorarId) query = query.where('id', '!=', ignorarId);
  return Boolean(await query.executeTakeFirst());
}

const colunas = (input: EntidadeInput) => ({
  tipo: input.tipo,
  codigo: input.codigo ?? null,
  nome: input.nome,
  cnpj: input.cnpj ?? null,
  contato: input.contato ?? null,
  ativo: input.ativo ?? true,
});

export async function createEntidade(input: EntidadeInput): Promise<string> {
  const row = await db
    .insertInto('entidades')
    .values(colunas(input))
    .returning('id')
    .executeTakeFirstOrThrow();
  return row.id;
}

export async function updateEntidade(
  id: string,
  expectedVersion: number,
  input: EntidadeInput,
): Promise<number | null> {
  const updated = await db
    .updateTable('entidades')
    .set({ ...colunas(input), version: expectedVersion + 1 })
    .where('id', '=', id)
    .where('version', '=', expectedVersion)
    .returning('version')
    .executeTakeFirst();
  return updated?.version ?? null; // null = conflito de versão
}

export async function deleteEntidade(id: string): Promise<boolean> {
  const res = await db.deleteFrom('entidades').where('id', '=', id).executeTakeFirst();
  return Number(res.numDeletedRows) > 0;
}
