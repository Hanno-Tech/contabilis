/**
 * Migration — Senhas do setor.
 *
 * Cofre de senhas do próprio departamento pessoal (não vinculadas a um cliente):
 * acessos a sistemas, portais e serviços usados pela equipe. A senha é
 * armazenada cifrada (AES-256-GCM) na coluna `senha_cipher`, como nas
 * credenciais do cliente.
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE senhas_setor (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nome         text NOT NULL,                     -- sistema / serviço
      link         text,
      usuario      text,
      senha_cipher text,                              -- senha cifrada (AES-256-GCM)
      observacoes  text,
      version      integer NOT NULL DEFAULT 1,
      created_at   timestamptz NOT NULL DEFAULT now(),
      updated_at   timestamptz NOT NULL DEFAULT now()
    );
  `);
  pgm.sql(`CREATE INDEX idx_senhas_setor_nome ON senhas_setor(nome);`);
  pgm.sql(`CREATE TRIGGER trg_senhas_setor_updated BEFORE UPDATE ON senhas_setor
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
}

/** @param {MigrationBuilder} pgm */
export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS senhas_setor;`);
}
