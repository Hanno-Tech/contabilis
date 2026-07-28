import bcrypt from 'bcryptjs';
import { db } from '../../db/index.js';

/** Custo do bcrypt — 12 rounds é o padrão recomendado atual para senhas de login. */
export const BCRYPT_ROUNDS = 12;

export interface Usuario {
  id: string;
  username: string;
  nome: string;
  email: string | null;
  senha_hash: string;
  ativo: boolean;
}

/**
 * Hash de descarte usado quando o usuário informado não existe. Comparar contra
 * ele mantém o custo do login constante, de modo que o tempo de resposta não
 * revele se um usuário está cadastrado (timing oracle).
 */
const DUMMY_HASH = bcrypt.hashSync('usuario-inexistente', BCRYPT_ROUNDS);

/** Busca por username (case-insensitive). Retorna também inativos — quem decide é o login. */
export async function findByUsername(username: string): Promise<Usuario | undefined> {
  const row = await db
    .selectFrom('usuarios')
    .select(['id', 'username', 'nome', 'email', 'senha_hash', 'ativo'])
    .where(({ eb, fn, val }) => eb(fn('lower', ['username']), '=', val(username.trim().toLowerCase())))
    .executeTakeFirst();
  return row;
}

/** Confere a senha. Sempre executa um bcrypt, mesmo sem usuário, para não vazar timing. */
export function checkPassword(usuario: Usuario | undefined, senha: string): boolean {
  if (!usuario) {
    bcrypt.compareSync(senha, DUMMY_HASH);
    return false;
  }
  return bcrypt.compareSync(senha, usuario.senha_hash);
}

export function hashPassword(senha: string): string {
  return bcrypt.hashSync(senha, BCRYPT_ROUNDS);
}

/** Usuários ativos para os selects do app (responsável por ocorrência, quem soluciona etc.). */
export async function listSelectableUsers(): Promise<Array<{ id: string; nome: string }>> {
  return db
    .selectFrom('usuarios')
    .select(['id', 'nome'])
    .where('ativo', '=', true)
    .orderBy('nome')
    .execute();
}

/** Confirma que o usuário do JWT ainda existe e está ativo (revogação de acesso). */
export async function isActive(id: string): Promise<boolean> {
  const row = await db
    .selectFrom('usuarios')
    .select('id')
    .where('id', '=', id)
    .where('ativo', '=', true)
    .executeTakeFirst();
  return Boolean(row);
}

export async function marcarAcesso(id: string): Promise<void> {
  await db.updateTable('usuarios').set({ ultimo_acesso: new Date() }).where('id', '=', id).execute();
}

export async function trocarSenha(id: string, novaSenha: string): Promise<void> {
  await db
    .updateTable('usuarios')
    .set({ senha_hash: hashPassword(novaSenha) })
    .where('id', '=', id)
    .execute();
}
