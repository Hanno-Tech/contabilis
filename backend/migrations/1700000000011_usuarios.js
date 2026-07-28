/**
 * Migration — Usuários da aplicação.
 *
 * Substitui a lista mockada em `src/modules/auth/users.ts`: o login passa a
 * consultar esta tabela. A senha é guardada apenas como hash bcrypt — nunca em
 * texto puro e nunca cifrada de forma reversível (diferente das credenciais de
 * portais dos clientes, que precisam ser reveladas).
 *
 * `ativo = false` bloqueia o login sem apagar o histórico: as tabelas de
 * ocorrências/pendências/eventos guardam `usuario_*_id` e `usuario_*_nome` por
 * cópia, então remover um usuário deixaria registros órfãos.
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE usuarios (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      username      text NOT NULL,
      nome          text NOT NULL,
      email         text,
      senha_hash    text NOT NULL,
      ativo         boolean NOT NULL DEFAULT true,
      ultimo_acesso timestamptz,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now()
    );
  `);
  // Login é case-insensitive: "Gisele" e "gisele" são o mesmo usuário.
  pgm.sql(`CREATE UNIQUE INDEX idx_usuarios_username ON usuarios(lower(username));`);
  pgm.sql(`CREATE TRIGGER trg_usuarios_updated BEFORE UPDATE ON usuarios
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
}

/** @param {MigrationBuilder} pgm */
export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS usuarios;`);
}
