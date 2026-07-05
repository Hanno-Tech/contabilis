/**
 * Migration — ajustes para listas suspensas:
 *  - data_meta_entrega_folha passa a ser texto (opções como "1º dia útil").
 *  - cliente_sindicatos ganha situacao_convencao (lista editável).
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE cliente_folha
      ALTER COLUMN data_meta_entrega_folha TYPE text
      USING data_meta_entrega_folha::text;
  `);
  pgm.sql(`ALTER TABLE cliente_sindicatos ADD COLUMN situacao_convencao text;`);
}

/** @param {MigrationBuilder} pgm */
export async function down(pgm) {
  pgm.sql(`ALTER TABLE cliente_sindicatos DROP COLUMN situacao_convencao;`);
  pgm.sql(`
    ALTER TABLE cliente_folha
      ALTER COLUMN data_meta_entrega_folha TYPE date
      USING (CASE WHEN data_meta_entrega_folha ~ '^\\d{4}-\\d{2}-\\d{2}$'
                  THEN data_meta_entrega_folha::date ELSE NULL END);
  `);
}
