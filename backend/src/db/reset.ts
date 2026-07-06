/**
 * Reset do banco — DROPA TODAS AS TABELAS (schema public) para que as migrations
 * rodem do zero em seguida. Uso: `npm run db:reset` (ou `npm run db:refresh`,
 * que já encadeia reset + migrations + seed).
 *
 * ⚠️ APAGA TODOS OS DADOS. Em NODE_ENV=production só roda com FORCE_RESET=true.
 */
import { sql } from 'kysely';
import { db, closeDb } from './index.js';

async function reset() {
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_RESET !== 'true') {
    console.error(
      'Recusando reset: NODE_ENV=production. Para confirmar, rode com FORCE_RESET=true.',
    );
    process.exit(1);
  }

  console.log('Resetando o schema public (apagando todas as tabelas)...');
  await sql`DROP SCHEMA public CASCADE`.execute(db);
  await sql`CREATE SCHEMA public`.execute(db);
  console.log('Schema recriado. Rode as migrations em seguida.');
}

reset()
  .catch((err) => {
    console.error('Falha no reset:', err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
