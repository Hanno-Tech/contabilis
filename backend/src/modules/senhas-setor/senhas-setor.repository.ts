import type { Selectable } from 'kysely';
import { db } from '../../db/index.js';
import type { SenhasSetorTable } from '../../db/types.js';
import { decrypt, encrypt } from '../../lib/crypto.js';
import type { SenhaSetorInput } from './senhas-setor.schema.js';

/** Linha "mascarada" — nunca devolve a senha em claro (só se há senha). */
function masked(r: Selectable<SenhasSetorTable>) {
  return {
    id: r.id,
    nome: r.nome,
    link: r.link,
    usuario: r.usuario,
    observacoes: r.observacoes,
    tem_senha: !!r.senha_cipher,
    version: r.version,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

const baseQuery = () =>
  db
    .selectFrom('senhas_setor')
    .select([
      'id',
      'nome',
      'link',
      'usuario',
      'senha_cipher',
      'observacoes',
      'version',
      'created_at',
      'updated_at',
    ]);

export async function listSenhasSetor(q?: string) {
  let query = baseQuery();
  if (q) {
    const term = `%${q.trim()}%`;
    query = query.where((eb) =>
      eb.or([
        eb('nome', 'ilike', term),
        eb('usuario', 'ilike', term),
        eb('observacoes', 'ilike', term),
      ]),
    );
  }
  const rows = await query.orderBy('nome').execute();
  return rows.map(masked);
}

export async function getSenhaSetor(id: string) {
  const row = await baseQuery().where('id', '=', id).executeTakeFirst();
  return row ? masked(row) : undefined;
}

export async function createSenhaSetor(input: SenhaSetorInput): Promise<string> {
  const row = await db
    .insertInto('senhas_setor')
    .values({
      nome: input.nome,
      link: input.link ?? null,
      usuario: input.usuario ?? null,
      senha_cipher: encrypt(input.senha),
      observacoes: input.observacoes ?? null,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return row.id;
}

export async function updateSenhaSetor(
  id: string,
  expectedVersion: number,
  input: SenhaSetorInput,
): Promise<number | null> {
  // A senha só é recifrada quando uma nova é informada; em branco, mantém a atual.
  const current = await db
    .selectFrom('senhas_setor')
    .select('senha_cipher')
    .where('id', '=', id)
    .executeTakeFirst();
  const senhaCipher = input.senha ? encrypt(input.senha) : current?.senha_cipher ?? null;

  const updated = await db
    .updateTable('senhas_setor')
    .set({
      nome: input.nome,
      link: input.link ?? null,
      usuario: input.usuario ?? null,
      senha_cipher: senhaCipher,
      observacoes: input.observacoes ?? null,
      version: expectedVersion + 1,
    })
    .where('id', '=', id)
    .where('version', '=', expectedVersion)
    .returning('version')
    .executeTakeFirst();
  return updated?.version ?? null; // null = conflito de versão
}

export async function deleteSenhaSetor(id: string): Promise<boolean> {
  const res = await db.deleteFrom('senhas_setor').where('id', '=', id).executeTakeFirst();
  return Number(res.numDeletedRows) > 0;
}

/** Revela a senha descriptografada (endpoint dedicado, como nas credenciais do cliente). */
export async function revelarSenhaSetor(id: string): Promise<{ senha: string | null } | null> {
  const row = await db
    .selectFrom('senhas_setor')
    .select('senha_cipher')
    .where('id', '=', id)
    .executeTakeFirst();
  if (!row) return null;
  return { senha: decrypt(row.senha_cipher) };
}
