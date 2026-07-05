/**
 * Migration — separa "informações gerais" (que permanecem em `clientes`) dos
 * dados de folha em diante, movidos para a nova tabela `cliente_folha` (1:1).
 *
 * `clientes` passa a ser a tabela central de identidade do cliente, usada por
 * outros módulos. Toda a parte operacional (folha, admissão, envio, sindicato/
 * convenção, SST, procurações, INSS) vai para `cliente_folha`.
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

// Colunas movidas de `clientes` para `cliente_folha` (mesma ordem em copy/drop).
const FOLHA_COLS = [
  'possui_folha',
  'forma_pagamento_salarios',
  'apura_ponto_escritorio',
  'realiza_lancamentos',
  'concede_plano_saude',
  'plano_operadora',
  'plano_beneficiarios',
  'fator_r',
  'atividade_concomitante',
  'construcao_civil',
  'cprb',
  'observacoes_folha',
  'prazo_envio_folhas',
  'folha_rotina_automatica',
  'prazo_contrato_experiencia',
  'lancamentos_fixos',
  'particularidades_cliente',
  'relatorios_admissao',
  'envio_meio',
  'envio_documento',
  'envio_contato',
  'sindicato',
  'convencao_aplicavel_nome',
  'convencao_id',
  'possui_laudos_sst',
  'empresa_responsavel_sst',
  'data_vencimento_laudo',
  'venc_procuracao_rfb',
  'venc_procuracao_det_fgts',
  'venc_procuracao_econsignado',
  'emails_notificacao_det',
  'inss_nit',
  'inss_codigo_recolhimento',
  'inss_salario_contribuicao',
  'inss_aliquota',
];

// Definições completas das colunas (para up e para o down que recria em clientes).
const FOLHA_DDL = `
  possui_folha                text,
  forma_pagamento_salarios    text,
  apura_ponto_escritorio      text,
  realiza_lancamentos         text,
  concede_plano_saude         text,
  plano_operadora             text,
  plano_beneficiarios         text,
  fator_r                     text,
  atividade_concomitante      text,
  construcao_civil            text,
  cprb                        text,
  observacoes_folha           text,
  prazo_envio_folhas          text,
  folha_rotina_automatica     text,
  prazo_contrato_experiencia  text,
  lancamentos_fixos           text,
  particularidades_cliente    text,
  relatorios_admissao         text,
  envio_meio                  text,
  envio_documento             text,
  envio_contato               text,
  sindicato                   text,
  convencao_aplicavel_nome    text,
  convencao_id                uuid REFERENCES convencoes(id) ON DELETE SET NULL,
  possui_laudos_sst           text,
  empresa_responsavel_sst     text,
  data_vencimento_laudo       date,
  venc_procuracao_rfb         date,
  venc_procuracao_det_fgts    date,
  venc_procuracao_econsignado date,
  emails_notificacao_det      text,
  inss_nit                    text,
  inss_codigo_recolhimento    text,
  inss_salario_contribuicao   numeric(12,2),
  inss_aliquota               numeric(6,4)
`;

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  const cols = FOLHA_COLS.join(', ');

  pgm.sql(`
    CREATE TABLE cliente_folha (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id uuid NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
      ${FOLHA_DDL},
      version    integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // Copia os dados existentes (1 linha de folha por cliente).
  pgm.sql(`INSERT INTO cliente_folha (cliente_id, ${cols}) SELECT id, ${cols} FROM clientes;`);

  // Remove as colunas migradas de clientes (o índice/constraint de convencao_id cai junto).
  pgm.sql(`ALTER TABLE clientes ${FOLHA_COLS.map((c) => `DROP COLUMN ${c}`).join(', ')};`);

  pgm.sql(`CREATE TRIGGER trg_cliente_folha_updated BEFORE UPDATE ON cliente_folha
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
  pgm.sql(`CREATE INDEX idx_cliente_folha_convencao ON cliente_folha(convencao_id);`);
}

/** @param {MigrationBuilder} pgm */
export async function down(pgm) {
  const cols = FOLHA_COLS.join(', ');
  // Recria as colunas em clientes e devolve os dados.
  pgm.sql(`ALTER TABLE clientes ADD COLUMN ${FOLHA_DDL.trim().replace(/,\s*$/, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(',\n ADD COLUMN ')};`);
  pgm.sql(`
    UPDATE clientes c
    SET ${FOLHA_COLS.map((col) => `${col} = f.${col}`).join(', ')}
    FROM cliente_folha f
    WHERE f.cliente_id = c.id;
  `);
  pgm.sql(`CREATE INDEX idx_clientes_convencao ON clientes(convencao_id);`);
  pgm.sql(`DROP TABLE IF EXISTS cliente_folha;`);
}
