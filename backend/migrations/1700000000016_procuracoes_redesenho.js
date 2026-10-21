/**
 * Migration — redesenho das procurações (e-Consignado e DET/FGTS).
 *
 * Cada procuração passa a ter situação (lista nova), data da situação e data
 * de vencimento. A procuração da RFB deixa de ser usada pelo setor: as colunas
 * ficam no banco (só saem da tela, dos relatórios e dos alertas), para não
 * perder histórico.
 *
 * As situações antigas ("Data informada", "Sem procuração", "Não se aplica")
 * são convertidas para a lista nova. A data da situação não existia, então
 * fica em branco nos registros atuais.
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE cliente_folha
      ADD COLUMN venc_procuracao_det_fgts_data_situacao    date,
      ADD COLUMN venc_procuracao_econsignado_data_situacao date;
  `);

  for (const col of ['venc_procuracao_det_fgts', 'venc_procuracao_econsignado']) {
    pgm.sql(`
      UPDATE cliente_folha SET ${col}_situacao = CASE
        WHEN ${col}_situacao = 'Data informada' THEN 'Ativa'
        WHEN ${col}_situacao = 'Sem procuração' THEN 'Não se aplica'
        ELSE ${col}_situacao
      END
      WHERE ${col}_situacao IN ('Data informada', 'Sem procuração');
    `);
  }
}

/** @param {MigrationBuilder} pgm */
export async function down(pgm) {
  for (const col of ['venc_procuracao_det_fgts', 'venc_procuracao_econsignado']) {
    pgm.sql(`
      UPDATE cliente_folha SET ${col}_situacao = CASE
        WHEN ${col}_situacao = 'Ativa' THEN 'Data informada'
        WHEN ${col}_situacao = 'Não se aplica' AND ${col} IS NULL THEN 'Sem procuração'
        ELSE ${col}_situacao
      END;
    `);
  }
  pgm.sql(`
    ALTER TABLE cliente_folha
      DROP COLUMN venc_procuracao_det_fgts_data_situacao,
      DROP COLUMN venc_procuracao_econsignado_data_situacao;
  `);
}
