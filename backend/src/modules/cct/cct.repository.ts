import { db } from '../../db/index.js';
import type { CctInput } from './cct.schema.js';

export interface CctListItem {
  id: string;
  apelido: string;
  sindicato_patronal: string | null;
  sindicato_laboral: string | null;
  situacao: string;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  data_expiracao: string | null;
  version: number;
}

const numToStr = (n: number | null | undefined): string | null =>
  n === null || n === undefined ? null : String(n);

export async function listConvencoes(): Promise<CctListItem[]> {
  return db
    .selectFrom('convencoes')
    .select([
      'id',
      'apelido',
      'sindicato_patronal',
      'sindicato_laboral',
      'situacao',
      'vigencia_inicio',
      'vigencia_fim',
      'data_expiracao',
      'version',
    ])
    .orderBy('apelido')
    .execute();
}

export async function getConvencao(id: string) {
  const convencao = await db
    .selectFrom('convencoes')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
  if (!convencao) return null;

  const [pisos, regras] = await Promise.all([
    db
      .selectFrom('convencao_pisos')
      .select(['id', 'funcao', 'valor', 'ordem'])
      .where('convencao_id', '=', id)
      .orderBy('ordem')
      .execute(),
    db
      .selectFrom('convencao_regras')
      .select(['id', 'categoria', 'titulo', 'conteudo', 'ordem'])
      .where('convencao_id', '=', id)
      .orderBy('ordem')
      .execute(),
  ]);

  return { ...convencao, pisos, regras };
}

function mainColumns(input: CctInput) {
  return {
    apelido: input.apelido,
    sindicato_patronal: input.sindicato_patronal ?? null,
    sindicato_laboral: input.sindicato_laboral ?? null,
    situacao: input.situacao,
    vigencia_inicio: input.vigencia_inicio ?? null,
    vigencia_fim: input.vigencia_fim ?? null,
    data_expiracao: input.data_expiracao ?? null,
    adicional_noturno: numToStr(input.adicional_noturno),
    he_dias_normais: numToStr(input.he_dias_normais),
    he_domingos_feriados: numToStr(input.he_domingos_feriados),
    he_observacoes: input.he_observacoes ?? null,
    contatos_sindicato: input.contatos_sindicato ?? null,
  };
}

async function replaceChildren(
  trx: typeof db,
  convencaoId: string,
  input: CctInput,
): Promise<void> {
  await trx.deleteFrom('convencao_pisos').where('convencao_id', '=', convencaoId).execute();
  await trx.deleteFrom('convencao_regras').where('convencao_id', '=', convencaoId).execute();

  if (input.pisos.length) {
    await trx
      .insertInto('convencao_pisos')
      .values(
        input.pisos.map((p, i) => ({
          convencao_id: convencaoId,
          funcao: p.funcao,
          valor: numToStr(p.valor),
          ordem: i,
        })),
      )
      .execute();
  }
  if (input.regras.length) {
    await trx
      .insertInto('convencao_regras')
      .values(
        input.regras.map((r, i) => ({
          convencao_id: convencaoId,
          categoria: r.categoria,
          titulo: r.titulo ?? null,
          conteudo: r.conteudo,
          ordem: i,
        })),
      )
      .execute();
  }
}

export async function createConvencao(input: CctInput): Promise<string> {
  return db.transaction().execute(async (trx) => {
    const row = await trx
      .insertInto('convencoes')
      .values(mainColumns(input))
      .returning('id')
      .executeTakeFirstOrThrow();
    await replaceChildren(trx as typeof db, row.id, input);
    return row.id;
  });
}

/**
 * Atualiza com locking otimista: só grava se a versão atual == expectedVersion.
 * Retorna a nova versão, ou null se houve conflito (registro já alterado).
 */
export async function updateConvencao(
  id: string,
  expectedVersion: number,
  input: CctInput,
): Promise<number | null> {
  return db.transaction().execute(async (trx) => {
    const updated = await trx
      .updateTable('convencoes')
      .set({ ...mainColumns(input), version: expectedVersion + 1 })
      .where('id', '=', id)
      .where('version', '=', expectedVersion)
      .returning('version')
      .executeTakeFirst();

    if (!updated) return null; // versão divergente => conflito
    await replaceChildren(trx as typeof db, id, input);
    return updated.version;
  });
}

export async function convencaoExists(id: string): Promise<boolean> {
  const row = await db
    .selectFrom('convencoes')
    .select('id')
    .where('id', '=', id)
    .executeTakeFirst();
  return !!row;
}

/** RF-23 — clientes vinculados a uma convenção. */
export async function listClientesDaConvencao(convencaoId: string) {
  return db
    .selectFrom('clientes')
    .select(['id', 'codigo', 'nome', 'cnpj', 'situacao', 'responsavel'])
    .where('convencao_id', '=', convencaoId)
    .orderBy('nome')
    .execute();
}
