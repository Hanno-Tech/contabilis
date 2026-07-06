/**
 * Runner de migrations próprio — aplica as migrations pendentes usando apenas o
 * driver `pg` (dependência de produção), sem depender do CLI `node-pg-migrate`.
 *
 * As migrations em `migrations/*.js` usam somente `pgm.sql(...)`, então aqui
 * "gravamos" um `pgm` mínimo que coleta os comandos SQL e os executa em ordem,
 * dentro de uma transação por migration. O controle de execução usa a mesma
 * tabela `pgmigrations` do node-pg-migrate (interoperável).
 *
 * Uso: `npm run db:migrate`
 */
import 'dotenv/config';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';

const MIGRATIONS_DIR = join(process.cwd(), 'migrations');

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL não definido (verifique o .env).');

  const pool = new pg.Pool({ connectionString });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pgmigrations (
        id     serial PRIMARY KEY,
        name   varchar(255) NOT NULL,
        run_on timestamp NOT NULL DEFAULT now()
      );
    `);

    const done = new Set(
      (await pool.query('SELECT name FROM pgmigrations')).rows.map((r) => r.name as string),
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.js'))
      .sort();

    let aplicadas = 0;
    for (const file of files) {
      const name = file.replace(/\.js$/, '');
      if (done.has(name)) continue;

      const mod = await import(pathToFileURL(join(MIGRATIONS_DIR, file)).href);
      if (typeof mod.up !== 'function') continue;

      const statements: string[] = [];
      const pgm = { sql: (text: string) => statements.push(text) };
      await mod.up(pgm);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const stmt of statements) await client.query(stmt);
        await client.query('INSERT INTO pgmigrations (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
        console.log(`✔ ${name}`);
        aplicadas++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`✖ falha em ${name}`);
        throw err;
      } finally {
        client.release();
      }
    }

    console.log(aplicadas ? `Migrations aplicadas: ${aplicadas}.` : 'Nada a aplicar (banco já atualizado).');
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Falha nas migrations:', err);
  process.exitCode = 1;
});
