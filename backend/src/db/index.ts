import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { env } from '../config/env.js';
import type { Database } from './types.js';

const { Pool } = pg;

// `numeric` (OID 1700) chega como string por padrão — mantemos assim para não
// perder precisão em valores monetários. As datas (`date`, OID 1082) também
// ficam como string 'YYYY-MM-DD' para evitar surpresas de fuso horário.
pg.types.setTypeParser(1082, (value) => value);

/**
 * TLS na conexão. Bancos gerenciados (Neon) exigem SSL e apresentam certificado
 * de uma CA pública, então a verificação padrão funciona — e é o que protege
 * contra man-in-the-middle. Postgres local não tem TLS.
 *
 * `DATABASE_SSL` sobrescreve a decisão automática:
 *   require   → exige TLS e valida o certificado
 *   no-verify → exige TLS sem validar (só para certificado autoassinado)
 *   disable   → sem TLS
 */
function sslConfig(): pg.PoolConfig['ssl'] {
  const modo = process.env.DATABASE_SSL;
  if (modo === 'disable') return undefined;
  if (modo === 'no-verify') return { rejectUnauthorized: false };
  if (modo === 'require') return { rejectUnauthorized: true };

  let host = '';
  try {
    host = new URL(env.databaseUrl).hostname;
  } catch {
    return undefined;
  }
  const ehLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  return ehLocal ? undefined : { rejectUnauthorized: true };
}

/**
 * Pool enxuto: em serverless cada instância da função tem o seu, e várias
 * instâncias sobem em paralelo sob carga. Muitas conexões por instância
 * esgotariam o limite do banco sem ganho — a concorrência real vem do pooler
 * do Neon (use a connection string cujo host termina em `-pooler`).
 */
export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: sslConfig(),
  max: env.isProd ? 3 : 10,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  // Permite que a instância serverless encerre sem esperar conexões ociosas.
  allowExitOnIdle: env.isProd,
});

// Sem este handler, um erro em conexão ociosa (o Neon derruba conexões paradas)
// derrubaria o processo inteiro em vez de apenas invalidar aquela conexão.
pool.on('error', (err) => {
  console.error('[pg] erro em conexão ociosa:', err.message);
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});

export async function closeDb(): Promise<void> {
  await db.destroy();
}
