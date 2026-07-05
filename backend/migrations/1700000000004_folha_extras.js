/**
 * Migration — novos campos em cliente_folha:
 *  - encargos_recolhidos_escritorio: texto livre (seção Folha)
 *  - inss_tipo_segurado: 'Autônomo' | 'Facultativo' (seção INSS)
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE cliente_folha
      ADD COLUMN encargos_recolhidos_escritorio text,
      ADD COLUMN inss_tipo_segurado text;
  `);
}

/** @param {MigrationBuilder} pgm */
export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE cliente_folha
      DROP COLUMN encargos_recolhidos_escritorio,
      DROP COLUMN inss_tipo_segurado;
  `);
}
