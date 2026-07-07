import { db } from '../../db/index.js';
import type { EventoInput } from './eventos.schema.js';

export interface EventoFilters {
  q?: string;
  cliente_id?: string;
  situacao?: string;
}

/** 'AAAA-MM' -> '1º dia do mês' para a coluna date. */
const competenciaToDate = (competencia: string) => `${competencia}-01`;

/** Colunas editáveis do evento (o usuário que lançou não muda na edição). */
function mainColumns(input: EventoInput) {
  return {
    cliente_id: input.cliente_id,
    competencia: competenciaToDate(input.competencia),
    colaborador_nome: input.colaborador_nome ?? null,
    descricao: input.descricao ?? null,
    situacao: input.situacao,
  };
}

const withCliente = () =>
  db
    .selectFrom('eventos_futuros')
    .innerJoin('clientes', 'clientes.id', 'eventos_futuros.cliente_id')
    .select([
      'eventos_futuros.id',
      'eventos_futuros.cliente_id',
      'eventos_futuros.competencia',
      'eventos_futuros.colaborador_nome',
      'eventos_futuros.descricao',
      'eventos_futuros.situacao',
      'eventos_futuros.usuario_id',
      'eventos_futuros.usuario_nome',
      'eventos_futuros.version',
      'eventos_futuros.created_at',
      'eventos_futuros.updated_at',
      'clientes.codigo as cliente_codigo',
      'clientes.nome as cliente_nome',
    ]);

export async function listEventos(filters: EventoFilters) {
  let query = withCliente();

  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    query = query.where((eb) =>
      eb.or([
        eb('eventos_futuros.colaborador_nome', 'ilike', term),
        eb('eventos_futuros.descricao', 'ilike', term),
        eb('clientes.nome', 'ilike', term),
      ]),
    );
  }
  if (filters.cliente_id) query = query.where('eventos_futuros.cliente_id', '=', filters.cliente_id);
  if (filters.situacao) query = query.where('eventos_futuros.situacao', '=', filters.situacao);

  return query
    .orderBy('eventos_futuros.competencia', 'asc')
    .orderBy('eventos_futuros.created_at', 'desc')
    .execute();
}

export async function getEvento(id: string) {
  return withCliente().where('eventos_futuros.id', '=', id).executeTakeFirst();
}

/** Cria o evento gravando o usuário que lançou (da sessão). */
export async function createEvento(
  input: EventoInput,
  autor: { id: string; nome: string },
): Promise<string> {
  const row = await db
    .insertInto('eventos_futuros')
    .values({
      ...mainColumns(input),
      usuario_id: autor.id,
      usuario_nome: autor.nome,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return row.id;
}

export async function updateEvento(
  id: string,
  expectedVersion: number,
  input: EventoInput,
): Promise<number | null> {
  const updated = await db
    .updateTable('eventos_futuros')
    .set({ ...mainColumns(input), version: expectedVersion + 1 })
    .where('id', '=', id)
    .where('version', '=', expectedVersion)
    .returning('version')
    .executeTakeFirst();
  return updated?.version ?? null; // null = conflito de versão
}

export async function deleteEvento(id: string): Promise<boolean> {
  const res = await db.deleteFrom('eventos_futuros').where('id', '=', id).executeTakeFirst();
  return Number(res.numDeletedRows) > 0;
}
