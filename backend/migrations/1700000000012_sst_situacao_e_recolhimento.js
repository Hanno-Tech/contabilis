/**
 * Migration — situação do laudo de SST e opção de recolhimento do INSS.
 *
 * 1) `data_vencimento_laudo_situacao`
 *    Na ficha, "Data de vencimento" do laudo deixa de ser só uma data: passa a
 *    ser "Desobrigada", "Não possui Laudo" ou uma data informada. A data
 *    continua na coluna `date` (é ela que alimenta os alertas de vencimento do
 *    dashboard); esta coluna guarda qual das três situações vale.
 *
 * 2) `inss_opcao_recolhimento`
 *    Contribuintes individuais passam a informar "Tipo de segurado" +
 *    "Opção de recolhimento"; o código de recolhimento e a alíquota são
 *    derivados desse par, não digitados.
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE cliente_folha
      ADD COLUMN data_vencimento_laudo_situacao text,
      ADD COLUMN inss_opcao_recolhimento        text;
  `);

  // Quem já tem data gravada está, por definição, com data informada.
  pgm.sql(`
    UPDATE cliente_folha
       SET data_vencimento_laudo_situacao = 'Data informada'
     WHERE data_vencimento_laudo IS NOT NULL;
  `);
}

/** @param {MigrationBuilder} pgm */
export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE cliente_folha
      DROP COLUMN data_vencimento_laudo_situacao,
      DROP COLUMN inss_opcao_recolhimento;
  `);
}
