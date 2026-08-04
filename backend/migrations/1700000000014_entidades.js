/**
 * Migration — cadastro de entidades externas (sindicatos e empresas de SST).
 *
 * Os dois têm exatamente os mesmos campos (código, nome, CNPJ, contato), então
 * vivem na mesma tabela com uma coluna `tipo`. Acrescentar outro tipo de
 * entidade depois (operadora de plano de saúde, por exemplo) não exige tabela
 * nova.
 *
 * É um cadastro independente: as listas suspensas da ficha do cliente
 * continuam vindo de `frontend/src/lib/listas.ts`. Este cadastro serve para
 * consultar código, CNPJ e contato de cada sindicato/empresa.
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE entidades (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tipo       text NOT NULL,          -- 'Sindicato' | 'Empresa de SST'
      codigo     text,
      nome       text NOT NULL,
      cnpj       text,
      contato    text,
      ativo      boolean NOT NULL DEFAULT true,
      version    integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  // Mesmo nome pode existir em tipos diferentes; dentro do tipo, não.
  pgm.sql(`CREATE UNIQUE INDEX idx_entidades_tipo_nome ON entidades(tipo, lower(nome));`);
  pgm.sql(`CREATE INDEX idx_entidades_tipo ON entidades(tipo);`);
  pgm.sql(`CREATE TRIGGER trg_entidades_updated BEFORE UPDATE ON entidades
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
}

/** @param {MigrationBuilder} pgm */
export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS entidades;`);
}
