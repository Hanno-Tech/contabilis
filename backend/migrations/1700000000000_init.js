/**
 * Migration inicial — todas as tabelas do MVP.
 * Escrita em JS (ESM) para rodar sem ts-node; o conteúdo é SQL puro via pgm.sql.
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  // Função e gatilho para manter `updated_at` sempre atual.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ---------------------------------------------------------------- Convenções
  pgm.sql(`
    CREATE TABLE convencoes (
      id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      apelido              text NOT NULL,
      sindicato_patronal   text,
      sindicato_laboral    text,
      situacao             text NOT NULL DEFAULT 'Vigente',
      vigencia_inicio      date,
      vigencia_fim         date,
      data_expiracao       date,
      adicional_noturno    numeric(6,4),
      he_dias_normais      numeric(6,4),
      he_domingos_feriados numeric(6,4),
      he_observacoes       text,
      contatos_sindicato   text,
      version              integer NOT NULL DEFAULT 1,
      created_at           timestamptz NOT NULL DEFAULT now(),
      updated_at           timestamptz NOT NULL DEFAULT now()
    );
  `);
  pgm.sql(`CREATE TRIGGER trg_convencoes_updated BEFORE UPDATE ON convencoes
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);

  pgm.sql(`
    CREATE TABLE convencao_pisos (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      convencao_id uuid NOT NULL REFERENCES convencoes(id) ON DELETE CASCADE,
      funcao       text NOT NULL,
      valor        numeric(12,2),
      ordem        integer NOT NULL DEFAULT 0
    );
  `);
  pgm.sql(`CREATE INDEX idx_pisos_convencao ON convencao_pisos(convencao_id);`);

  pgm.sql(`
    CREATE TABLE convencao_regras (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      convencao_id uuid NOT NULL REFERENCES convencoes(id) ON DELETE CASCADE,
      categoria    text NOT NULL,
      titulo       text,
      conteudo     text NOT NULL,
      ordem        integer NOT NULL DEFAULT 0
    );
  `);
  pgm.sql(`CREATE INDEX idx_regras_convencao ON convencao_regras(convencao_id);`);

  // ------------------------------------------------------------------ Clientes
  pgm.sql(`
    CREATE TABLE clientes (
      id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      codigo                      integer NOT NULL UNIQUE,
      nome                        text NOT NULL,
      cnpj                        text,
      tipo_cliente                text,
      regime_tributacao           text,
      situacao                    text NOT NULL DEFAULT 'Ativa',
      data_evento_situacao        date,
      responsavel                 text,
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
      inss_aliquota               numeric(6,4),
      version                     integer NOT NULL DEFAULT 1,
      created_at                  timestamptz NOT NULL DEFAULT now(),
      updated_at                  timestamptz NOT NULL DEFAULT now()
    );
  `);
  pgm.sql(`CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON clientes
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
  pgm.sql(`CREATE INDEX idx_clientes_convencao ON clientes(convencao_id);`);
  pgm.sql(`CREATE INDEX idx_clientes_situacao ON clientes(situacao);`);
  pgm.sql(`CREATE INDEX idx_clientes_responsavel ON clientes(responsavel);`);
  // Busca textual por nome / cnpj (RNF-03).
  pgm.sql(`CREATE INDEX idx_clientes_busca ON clientes
           USING gin (to_tsvector('portuguese', coalesce(nome,'') || ' ' || coalesce(cnpj,'')));`);

  // ------------------------------------------------------ Credenciais sensíveis
  pgm.sql(`
    CREATE TABLE cliente_credenciais (
      id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id         uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      tipo               text NOT NULL,
      usuario            text,
      senha_cipher       text,
      email              text,
      email_senha_cipher text,
      created_at         timestamptz NOT NULL DEFAULT now(),
      updated_at         timestamptz NOT NULL DEFAULT now(),
      UNIQUE (cliente_id, tipo)
    );
  `);
  pgm.sql(`CREATE TRIGGER trg_credenciais_updated BEFORE UPDATE ON cliente_credenciais
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
}

/** @param {MigrationBuilder} pgm */
export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS cliente_credenciais;`);
  pgm.sql(`DROP TABLE IF EXISTS clientes;`);
  pgm.sql(`DROP TABLE IF EXISTS convencao_regras;`);
  pgm.sql(`DROP TABLE IF EXISTS convencao_pisos;`);
  pgm.sql(`DROP TABLE IF EXISTS convencoes;`);
  pgm.sql(`DROP FUNCTION IF EXISTS set_updated_at();`);
}
