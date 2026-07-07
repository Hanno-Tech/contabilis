/**
 * Migration — remove o módulo de Convenções (CCT).
 *
 * A convenção deixa de ser um cadastro vinculado e passa a ser texto livre na
 * ficha do cliente (campo `convencao_aplicavel_nome`). Antes de dropar, o
 * apelido da convenção vinculada é copiado para o texto livre onde ele estiver
 * vazio, preservando a informação. Em seguida a coluna de vínculo `convencao_id`
 * e as tabelas de convenção são removidas.
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  // 1. Backfill do texto livre a partir do apelido da CCT vinculada (onde vazio).
  pgm.sql(`
    UPDATE cliente_sindicatos cs
       SET convencao_aplicavel_nome = c.apelido
      FROM convencoes c
     WHERE cs.convencao_id = c.id
       AND (cs.convencao_aplicavel_nome IS NULL OR cs.convencao_aplicavel_nome = '');
  `);
  pgm.sql(`
    UPDATE cliente_folha cf
       SET convencao_aplicavel_nome = c.apelido
      FROM convencoes c
     WHERE cf.convencao_id = c.id
       AND (cf.convencao_aplicavel_nome IS NULL OR cf.convencao_aplicavel_nome = '');
  `);

  // 2. Remove a coluna de vínculo.
  pgm.sql(`ALTER TABLE cliente_sindicatos DROP COLUMN IF EXISTS convencao_id;`);
  pgm.sql(`ALTER TABLE cliente_folha DROP COLUMN IF EXISTS convencao_id;`);

  // 3. Remove as tabelas do módulo de convenções.
  pgm.sql(`DROP TABLE IF EXISTS convencao_regras;`);
  pgm.sql(`DROP TABLE IF EXISTS convencao_pisos;`);
  pgm.sql(`DROP TABLE IF EXISTS convencoes;`);
}

/** @param {MigrationBuilder} pgm */
export async function down() {
  // Remoção definitiva — sem rollback (o texto livre já preserva o nome).
  throw new Error('Migration irreversível: o módulo de convenções foi removido.');
}
