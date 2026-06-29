import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { env } from '../config/env.js';
import type { Database } from './types.js';

const { Pool } = pg;

// `numeric` (OID 1700) chega como string por padrão — mantemos assim para não
// perder precisão em valores monetários. As datas (`date`, OID 1082) também
// ficam como string 'YYYY-MM-DD' para evitar surpresas de fuso horário.
pg.types.setTypeParser(1082, (value) => value);

export const pool = new Pool({ connectionString: env.databaseUrl });

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});

export async function closeDb(): Promise<void> {
  await db.destroy();
}
