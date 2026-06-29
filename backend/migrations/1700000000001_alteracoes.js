/**
 * Migration — trilha de auditoria (RF: registrar tudo que os usuários alteram).
 * Cada linha é um evento (criação/edição) sobre um cliente ou uma convenção,
 * com o autor, o instante e a lista campo-a-campo do que mudou (de → para).
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE alteracoes (
      id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      entidade       text NOT NULL,            -- 'cliente' | 'convencao'
      entidade_id    uuid NOT NULL,
      entidade_label text,                     -- nome/apelido p/ exibição
      acao           text NOT NULL,            -- 'criou' | 'editou'
      usuario_id     text,
      usuario_nome   text,
      alteracoes     jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{campo,rotulo,de,para}]
      created_at     timestamptz NOT NULL DEFAULT now()
    );
  `);
  pgm.sql(`CREATE INDEX idx_alteracoes_entidade ON alteracoes(entidade, entidade_id);`);
  pgm.sql(`CREATE INDEX idx_alteracoes_created ON alteracoes(created_at DESC);`);
}

/** @param {MigrationBuilder} pgm */
export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS alteracoes;`);
}
