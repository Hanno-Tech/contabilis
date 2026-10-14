import { z } from 'zod';
import type { Setor } from '../db/types.js';

/**
 * Setores do escritório. Ocorrências, pendências, eventos futuros, senhas e
 * relatórios existem nos dois, com o mesmo fluxo — cada registro pertence a um.
 */
export const SETORES = ['pessoal', 'contabil'] as const satisfies readonly Setor[];

export const setorSchema = z.enum(SETORES).default('pessoal');

/**
 * Setor pedido na query string. Sem `?setor=`, vale o pessoal: era o único
 * setor quando as rotas foram criadas, e quem as chama sem o parâmetro espera
 * só os registros dele.
 */
export function setorDaQuery(value: unknown): Setor {
  return value === 'contabil' ? 'contabil' : 'pessoal';
}
