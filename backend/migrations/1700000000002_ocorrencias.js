/**
 * Migration — ocorrências vinculadas a clientes.
 * Cada linha registra um evento ocorrido com um cliente: o que aconteceu,
 * a resolução/observação, a situação (Resolvido | Não resolvido | Em análise)
 * e qual usuário lidou com a ocorrência.
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE ocorrencias (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id       uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      data             date NOT NULL,
      ocorrencia       text NOT NULL,                       -- o que aconteceu
      resolucao        text,                                -- resolução ou observação
      situacao         text NOT NULL DEFAULT 'Em análise',  -- Resolvido | Não resolvido | Em análise
      responsavel_id   text,                                -- usuário que lidou
      responsavel_nome text,
      version          integer NOT NULL DEFAULT 1,
      created_at       timestamptz NOT NULL DEFAULT now(),
      updated_at       timestamptz NOT NULL DEFAULT now()
    );
  `);
  pgm.sql(`CREATE INDEX idx_ocorrencias_cliente ON ocorrencias(cliente_id);`);
  pgm.sql(`CREATE INDEX idx_ocorrencias_situacao ON ocorrencias(situacao);`);
  pgm.sql(`CREATE INDEX idx_ocorrencias_data ON ocorrencias(data DESC);`);
  pgm.sql(`CREATE TRIGGER trg_ocorrencias_updated BEFORE UPDATE ON ocorrencias
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
}

/** @param {MigrationBuilder} pgm */
export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS ocorrencias;`);
}
