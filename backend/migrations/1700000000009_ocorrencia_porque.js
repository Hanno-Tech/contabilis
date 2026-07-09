/**
 * Migration — Ocorrências: campo "Por que aconteceu".
 *
 * A ocorrência passa a registrar, além do que aconteceu (ocorrencia) e da medida
 * adotada (resolucao), o motivo/causa do que ocorreu.
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  pgm.sql(`ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS porque text;`);
}

/** @param {MigrationBuilder} pgm */
export async function down(pgm) {
  pgm.sql(`ALTER TABLE ocorrencias DROP COLUMN IF EXISTS porque;`);
}
