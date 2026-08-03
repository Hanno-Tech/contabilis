/**
 * Migration — situação das procurações.
 *
 * Mesmo problema que o laudo de SST tinha: a planilha registrava "Sem
 * Procuração" / "Não se aplica" numa coluna de data, e essas informações
 * viraram NULL na carga — indistinguíveis de "ainda não cadastrado". Cerca de
 * 300 clientes ficaram assim, e sem isso nunca sairiam da lista de fichas
 * incompletas.
 *
 * A data continua em coluna `date` (alimenta os alertas de vencimento); a
 * situação diz se aquela data existe, se o cliente não tem procuração ou se
 * o caso não se aplica.
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE cliente_folha
      ADD COLUMN venc_procuracao_rfb_situacao          text,
      ADD COLUMN venc_procuracao_det_fgts_situacao     text,
      ADD COLUMN venc_procuracao_econsignado_situacao  text;
  `);

  // Quem já tem data está, por definição, com data informada.
  pgm.sql(`
    UPDATE cliente_folha SET
      venc_procuracao_rfb_situacao =
        CASE WHEN venc_procuracao_rfb IS NOT NULL THEN 'Data informada' END,
      venc_procuracao_det_fgts_situacao =
        CASE WHEN venc_procuracao_det_fgts IS NOT NULL THEN 'Data informada' END,
      venc_procuracao_econsignado_situacao =
        CASE WHEN venc_procuracao_econsignado IS NOT NULL THEN 'Data informada' END;
  `);
}

/** @param {MigrationBuilder} pgm */
export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE cliente_folha
      DROP COLUMN venc_procuracao_rfb_situacao,
      DROP COLUMN venc_procuracao_det_fgts_situacao,
      DROP COLUMN venc_procuracao_econsignado_situacao;
  `);
}
