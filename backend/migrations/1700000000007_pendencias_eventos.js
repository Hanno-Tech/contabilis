/**
 * Migration — Pendências e Eventos futuros (submenus do Setor Pessoal).
 *
 * Pendências: serviços que surgem durante o período da folha. Cada linha grava
 * a data do dia em que foi cadastrada, a descrição, quem cadastrou, quem vai
 * solucionar e a situação (Aberta | Desconsiderada | Resolvida).
 *
 * Eventos futuros: lançamentos programados (ex.: alteração de salário no fim do
 * ano). Guardam o cliente, a competência de lançamento, o colaborador, quem
 * lançou e a situação (A lançar | Lançado | Cancelado). A competência é
 * armazenada como o 1º dia do mês para permitir alertas de proximidade.
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE pendencias (
      id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id             uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      data                   date NOT NULL DEFAULT current_date,   -- dia do cadastro
      descricao              text NOT NULL,
      usuario_cadastro_id    text,
      usuario_cadastro_nome  text,
      usuario_solucao_id     text,
      usuario_solucao_nome   text,
      situacao               text NOT NULL DEFAULT 'Aberta',        -- Aberta | Desconsiderada | Resolvida
      version                integer NOT NULL DEFAULT 1,
      created_at             timestamptz NOT NULL DEFAULT now(),
      updated_at             timestamptz NOT NULL DEFAULT now()
    );
  `);
  pgm.sql(`CREATE INDEX idx_pendencias_cliente ON pendencias(cliente_id);`);
  pgm.sql(`CREATE INDEX idx_pendencias_situacao ON pendencias(situacao);`);
  pgm.sql(`CREATE INDEX idx_pendencias_data ON pendencias(data DESC);`);
  pgm.sql(`CREATE TRIGGER trg_pendencias_updated BEFORE UPDATE ON pendencias
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.sql(`
    CREATE TABLE eventos_futuros (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id       uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      competencia      date NOT NULL,                          -- 1º dia do mês de lançamento
      colaborador_nome text,
      descricao        text,                                   -- o que será lançado (ex.: alteração de salário)
      usuario_id       text,                                   -- usuário que lançou o evento
      usuario_nome     text,
      situacao         text NOT NULL DEFAULT 'A lançar',       -- A lançar | Lançado | Cancelado
      version          integer NOT NULL DEFAULT 1,
      created_at       timestamptz NOT NULL DEFAULT now(),
      updated_at       timestamptz NOT NULL DEFAULT now()
    );
  `);
  pgm.sql(`CREATE INDEX idx_eventos_cliente ON eventos_futuros(cliente_id);`);
  pgm.sql(`CREATE INDEX idx_eventos_situacao ON eventos_futuros(situacao);`);
  pgm.sql(`CREATE INDEX idx_eventos_competencia ON eventos_futuros(competencia);`);
  pgm.sql(`CREATE TRIGGER trg_eventos_updated BEFORE UPDATE ON eventos_futuros
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
}

/** @param {MigrationBuilder} pgm */
export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS eventos_futuros;`);
  pgm.sql(`DROP TABLE IF EXISTS pendencias;`);
}
