import { db } from '../../db/index.js';
import type { PendenciaInput } from './pendencias.schema.js';

export interface PendenciaFilters {
  q?: string;
  cliente_id?: string;
  situacao?: string;
  solucao_id?: string;
  data_de?: string;
  data_ate?: string;
}

/** Colunas editáveis da pendência (a data e quem cadastrou não mudam na edição). */
function mainColumns(input: PendenciaInput) {
  return {
    cliente_id: input.cliente_id,
    descricao: input.descricao,
    situacao: input.situacao,
    usuario_solucao_id: input.usuario_solucao_id ?? null,
    usuario_solucao_nome: input.usuario_solucao_nome ?? null,
  };
}

const withCliente = () =>
  db
    .selectFrom('pendencias')
    .innerJoin('clientes', 'clientes.id', 'pendencias.cliente_id')
    .select([
      'pendencias.id',
      'pendencias.cliente_id',
      'pendencias.data',
      'pendencias.descricao',
      'pendencias.situacao',
      'pendencias.usuario_cadastro_id',
      'pendencias.usuario_cadastro_nome',
      'pendencias.usuario_solucao_id',
      'pendencias.usuario_solucao_nome',
      'pendencias.version',
      'pendencias.created_at',
      'pendencias.updated_at',
      'clientes.codigo as cliente_codigo',
      'clientes.nome as cliente_nome',
    ]);

export async function listPendencias(filters: PendenciaFilters) {
  let query = withCliente();

  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    query = query.where((eb) =>
      eb.or([eb('pendencias.descricao', 'ilike', term), eb('clientes.nome', 'ilike', term)]),
    );
  }
  if (filters.cliente_id) query = query.where('pendencias.cliente_id', '=', filters.cliente_id);
  if (filters.situacao) query = query.where('pendencias.situacao', '=', filters.situacao);
  if (filters.solucao_id) query = query.where('pendencias.usuario_solucao_id', '=', filters.solucao_id);
  if (filters.data_de) query = query.where('pendencias.data', '>=', filters.data_de);
  if (filters.data_ate) query = query.where('pendencias.data', '<=', filters.data_ate);

  return query
    .orderBy('pendencias.data', 'desc')
    .orderBy('pendencias.created_at', 'desc')
    .execute();
}

export async function getPendencia(id: string) {
  return withCliente().where('pendencias.id', '=', id).executeTakeFirst();
}

/** Cria a pendência gravando o dia do cadastro e o usuário que cadastrou. */
export async function createPendencia(
  input: PendenciaInput,
  cadastro: { id: string; nome: string },
  data: string,
): Promise<string> {
  const row = await db
    .insertInto('pendencias')
    .values({
      ...mainColumns(input),
      data,
      usuario_cadastro_id: cadastro.id,
      usuario_cadastro_nome: cadastro.nome,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return row.id;
}

export async function updatePendencia(
  id: string,
  expectedVersion: number,
  input: PendenciaInput,
): Promise<number | null> {
  const updated = await db
    .updateTable('pendencias')
    .set({ ...mainColumns(input), version: expectedVersion + 1 })
    .where('id', '=', id)
    .where('version', '=', expectedVersion)
    .returning('version')
    .executeTakeFirst();
  return updated?.version ?? null; // null = conflito de versão
}

export async function deletePendencia(id: string): Promise<boolean> {
  const res = await db.deleteFrom('pendencias').where('id', '=', id).executeTakeFirst();
  return Number(res.numDeletedRows) > 0;
}
