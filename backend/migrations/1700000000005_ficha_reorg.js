/**
 * Migration — reorganização da ficha (Visão geral).
 *  - Novos campos escalares em cliente_folha.
 *  - Procuração DET/FGTS separadas (copia o valor combinado para as duas).
 *  - Nova tabela cliente_sindicatos (a empresa pode ter mais de um sindicato/convenção).
 *  - Coluna `link` em cliente_credenciais (quadro SENHAS por órgão).
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE cliente_folha
      ADD COLUMN inss_retido_nf              text,
      ADD COLUMN cargos_insalubres_perigosos text,
      ADD COLUMN responsavel_fechamento_folha text,
      ADD COLUMN codigo_rotina_automatica    text,
      ADD COLUMN data_meta_entrega_folha     date,
      ADD COLUMN termo_ciencia_sst           text,
      ADD COLUMN envio_observacoes           text,
      ADD COLUMN venc_procuracao_det         date,
      ADD COLUMN venc_procuracao_fgts        date;
  `);

  // DET/FGTS eram um campo só: copia o valor combinado para os dois novos.
  pgm.sql(`
    UPDATE cliente_folha
    SET venc_procuracao_det = venc_procuracao_det_fgts,
        venc_procuracao_fgts = venc_procuracao_det_fgts
    WHERE venc_procuracao_det_fgts IS NOT NULL;
  `);

  // Sindicatos / convenções (vários por cliente).
  pgm.sql(`
    CREATE TABLE cliente_sindicatos (
      id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id               uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      sindicato                text,
      convencao_id             uuid REFERENCES convencoes(id) ON DELETE SET NULL,
      convencao_aplicavel_nome text,
      recolhe_contribuicao     text,       -- 'Sim' | 'Não'
      ordem                    integer NOT NULL DEFAULT 0
    );
  `);
  pgm.sql(`CREATE INDEX idx_cliente_sindicatos_cliente ON cliente_sindicatos(cliente_id);`);
  pgm.sql(`CREATE INDEX idx_cliente_sindicatos_convencao ON cliente_sindicatos(convencao_id);`);

  // Migra o sindicato/convenção único existente para uma linha.
  pgm.sql(`
    INSERT INTO cliente_sindicatos (cliente_id, sindicato, convencao_id, convencao_aplicavel_nome, ordem)
    SELECT cliente_id, sindicato, convencao_id, convencao_aplicavel_nome, 0
    FROM cliente_folha
    WHERE sindicato IS NOT NULL OR convencao_id IS NOT NULL OR convencao_aplicavel_nome IS NOT NULL;
  `);

  // SENHAS: link de acesso por órgão.
  pgm.sql(`ALTER TABLE cliente_credenciais ADD COLUMN link text;`);
}

/** @param {MigrationBuilder} pgm */
export async function down(pgm) {
  pgm.sql(`ALTER TABLE cliente_credenciais DROP COLUMN link;`);
  pgm.sql(`DROP TABLE IF EXISTS cliente_sindicatos;`);
  pgm.sql(`
    ALTER TABLE cliente_folha
      DROP COLUMN inss_retido_nf,
      DROP COLUMN cargos_insalubres_perigosos,
      DROP COLUMN responsavel_fechamento_folha,
      DROP COLUMN codigo_rotina_automatica,
      DROP COLUMN data_meta_entrega_folha,
      DROP COLUMN termo_ciencia_sst,
      DROP COLUMN envio_observacoes,
      DROP COLUMN venc_procuracao_det,
      DROP COLUMN venc_procuracao_fgts;
  `);
}
