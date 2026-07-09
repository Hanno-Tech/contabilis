import { db } from '../../db/index.js';
import type { OcorrenciaInput } from './ocorrencias.schema.js';

export interface OcorrenciaFilters {
  q?: string;
  cliente_id?: string;
  situacao?: string;
  responsavel_id?: string;
  data_de?: string;
  data_ate?: string;
}

/** Colunas escalares da ocorrência a partir da entrada validada. */
function mainColumns(input: OcorrenciaInput) {
  return {
    cliente_id: input.cliente_id,
    data: input.data,
    ocorrencia: input.ocorrencia,
    porque: input.porque ?? null,
    resolucao: input.resolucao ?? null,
    situacao: input.situacao,
    responsavel_id: input.responsavel_id ?? null,
    responsavel_nome: input.responsavel_nome ?? null,
  };
}

const withCliente = () =>
  db
    .selectFrom('ocorrencias')
    .innerJoin('clientes', 'clientes.id', 'ocorrencias.cliente_id')
    .select([
      'ocorrencias.id',
      'ocorrencias.cliente_id',
      'ocorrencias.data',
      'ocorrencias.ocorrencia',
      'ocorrencias.porque',
      'ocorrencias.resolucao',
      'ocorrencias.situacao',
      'ocorrencias.responsavel_id',
      'ocorrencias.responsavel_nome',
      'ocorrencias.version',
      'ocorrencias.created_at',
      'ocorrencias.updated_at',
      'clientes.codigo as cliente_codigo',
      'clientes.nome as cliente_nome',
    ]);

export async function listOcorrencias(filters: OcorrenciaFilters) {
  let query = withCliente();

  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    query = query.where((eb) =>
      eb.or([
        eb('ocorrencias.ocorrencia', 'ilike', term),
        eb('ocorrencias.porque', 'ilike', term),
        eb('ocorrencias.resolucao', 'ilike', term),
        eb('clientes.nome', 'ilike', term),
      ]),
    );
  }
  if (filters.cliente_id) query = query.where('ocorrencias.cliente_id', '=', filters.cliente_id);
  if (filters.situacao) query = query.where('ocorrencias.situacao', '=', filters.situacao);
  if (filters.responsavel_id)
    query = query.where('ocorrencias.responsavel_id', '=', filters.responsavel_id);
  if (filters.data_de) query = query.where('ocorrencias.data', '>=', filters.data_de);
  if (filters.data_ate) query = query.where('ocorrencias.data', '<=', filters.data_ate);

  return query.orderBy('ocorrencias.data', 'desc').orderBy('ocorrencias.created_at', 'desc').execute();
}

export async function getOcorrencia(id: string) {
  return withCliente().where('ocorrencias.id', '=', id).executeTakeFirst();
}

export async function createOcorrencia(input: OcorrenciaInput): Promise<string> {
  const row = await db
    .insertInto('ocorrencias')
    .values(mainColumns(input))
    .returning('id')
    .executeTakeFirstOrThrow();
  return row.id;
}

export async function updateOcorrencia(
  id: string,
  expectedVersion: number,
  input: OcorrenciaInput,
): Promise<number | null> {
  const updated = await db
    .updateTable('ocorrencias')
    .set({ ...mainColumns(input), version: expectedVersion + 1 })
    .where('id', '=', id)
    .where('version', '=', expectedVersion)
    .returning('version')
    .executeTakeFirst();
  return updated?.version ?? null; // null = conflito de versão
}

export async function deleteOcorrencia(id: string): Promise<boolean> {
  const res = await db.deleteFrom('ocorrencias').where('id', '=', id).executeTakeFirst();
  return Number(res.numDeletedRows) > 0;
}
