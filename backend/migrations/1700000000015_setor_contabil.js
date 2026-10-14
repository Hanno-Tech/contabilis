/**
 * Migration — Setor contábil.
 *
 * 1) `setor` em ocorrências, pendências, eventos futuros e senhas do setor.
 *    Os dois setores usam as mesmas telas e o mesmo fluxo; o que muda é a
 *    carteira de registros. Tudo o que já existe é do setor pessoal.
 *
 * 2) `setor` na trilha de alterações. Fica NULL nas edições do cadastro geral
 *    do cliente (menu "Clientes"), que interessam aos dois setores; as demais
 *    levam o setor do registro alterado.
 *
 * 3) `cliente_contabil` — ficha contábil do cliente (1:1 com `clientes`),
 *    espelhando a planilha "Informações Gerais": dados da empresa que só o
 *    contábil usa, informações tributárias e critérios contábeis.
 *
 * 4) `imoveis` — controle de imóveis dos clientes (planilha FRSoc-019):
 *    descrição, processo de integralização, dados para o IPTU, informações
 *    contábeis e situação.
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

export const shorthands = undefined;

const TABELAS_COM_SETOR = ['ocorrencias', 'pendencias', 'eventos_futuros', 'senhas_setor'];

/** @param {MigrationBuilder} pgm */
export async function up(pgm) {
  for (const tabela of TABELAS_COM_SETOR) {
    pgm.sql(`
      ALTER TABLE ${tabela}
        ADD COLUMN setor text NOT NULL DEFAULT 'pessoal'
        CHECK (setor IN ('pessoal', 'contabil'));
    `);
    pgm.sql(`CREATE INDEX idx_${tabela}_setor ON ${tabela}(setor);`);
  }

  pgm.sql(`
    ALTER TABLE alteracoes
      ADD COLUMN setor text CHECK (setor IN ('pessoal', 'contabil'));
  `);
  // O que já foi registrado veio do setor pessoal — inclusive as edições do
  // cadastro geral, que antes desta migration não eram distinguidas.
  pgm.sql(`UPDATE alteracoes SET setor = 'pessoal';`);
  pgm.sql(`CREATE INDEX idx_alteracoes_setor ON alteracoes(setor);`);

  // ------------------------------------------------------------ Ficha contábil
  pgm.sql(`
    CREATE TABLE cliente_contabil (
      id                                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id                        uuid NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
      -- Dados da empresa
      grupo_empresarial                 text,
      ramo_atividade                    text,
      responsavel                       text,
      prioridade                        text,
      nbc_tg                            text,
      checklist_conferencia             text,
      possui_software_gestao            text,
      possui_pj_qsa                     text,
      -- Informações tributárias
      periodicidade_irpj_csll           text,
      forma_apuracao_irpj_csll          text,
      possui_beneficio_fiscal           text,
      qual_beneficio_fiscal             text,
      -- Ativo circulante: disponibilidades
      contabiliza_contas_bancarias      text,
      usa_contabilidade_digital         text,
      contabiliza_aplicacoes            text,
      recebe_cartao_credito             text,
      -- Ativo circulante: clientes
      controla_contas_receber           text,
      envia_relacao_recebimentos        text,
      envia_relatorio_contas_receber    text,
      -- Ativo circulante: estoque
      possui_estoque                    text,
      tipos_estoque                     text,
      controla_estoque                  text,
      envia_cmv                         text,
      margem_valor_agregado             text,
      envia_inventario                  text,
      -- Ativo circulante: despesas do exercício seguinte
      paga_anuidade_orgao_classe        text,
      possui_imoveis_urbanos            text,
      possui_imoveis_rurais             text,
      possui_veiculos                   text,
      possui_seguros                    text,
      possui_alvara_sanitario           text,
      possui_licenca_ambiental          text,
      -- Ativo não circulante
      contabiliza_investimentos         text,
      possui_participacoes_societarias  text,
      possui_imobilizado                text,
      -- Passivo circulante
      controla_contas_pagar             text,
      envia_relacao_pagamentos          text,
      envia_relatorio_contas_pagar      text,
      possui_emprestimos                text,
      -- Patrimônio líquido
      forma_distribuicao_lucros         text,
      -- Controle
      version                           integer NOT NULL DEFAULT 1,
      created_at                        timestamptz NOT NULL DEFAULT now(),
      updated_at                        timestamptz NOT NULL DEFAULT now()
    );
  `);
  pgm.sql(`CREATE TRIGGER trg_cliente_contabil_updated BEFORE UPDATE ON cliente_contabil
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
  pgm.sql(`CREATE INDEX idx_cliente_contabil_responsavel ON cliente_contabil(responsavel);`);
  // Uma ficha (vazia) para cada cliente existente, como `cliente_folha`.
  pgm.sql(`INSERT INTO cliente_contabil (cliente_id) SELECT id FROM clientes;`);

  // ------------------------------------------------------------------- Imóveis
  pgm.sql(`
    CREATE TABLE imoveis (
      id                               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id                       uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
      numero_ordem                     integer NOT NULL,
      -- Descrição detalhada do imóvel
      tipo                             text,           -- Urbano | Rural
      municipio                        text,
      matricula                        text,
      cib                              text,
      codigo_prefeitura                text,           -- código reduzido do imóvel
      lugar                            text,
      lote                             text,
      quadra                           text,
      loteamento                       text,
      area                             text,
      cartorio                         text,
      forma_aquisicao                  text,           -- Integralização | Compra | Recebido em doação
      utilizacao                       text,
      -- Processo de integralização
      itbi_isencao_obtida              text,
      itbi_diferenca_paga              text,
      documentos_enviados_ri           text,
      integralizacao_concluida         text,
      titularidade_prefeitura          text,
      transferencia_finalizada         text,
      -- Cálculo anual do IPTU
      valor_venal                      numeric(14,2),
      indice_atualizacao               text,
      dados_aliquota                   text,
      -- Informações contábeis
      valor_aquisicao                  numeric(14,2),
      contabilizado                    text,
      grupo_contabilizado              text,           -- Imobilizado | Estoque
      itbi_contabilizado               text,
      taxas_cartorio_contabilizadas    text,
      -- Situação
      situacao                         text NOT NULL DEFAULT 'Ativo',
      version                          integer NOT NULL DEFAULT 1,
      created_at                       timestamptz NOT NULL DEFAULT now(),
      updated_at                       timestamptz NOT NULL DEFAULT now(),
      UNIQUE (cliente_id, numero_ordem)
    );
  `);
  pgm.sql(`CREATE INDEX idx_imoveis_cliente ON imoveis(cliente_id);`);
  pgm.sql(`CREATE INDEX idx_imoveis_situacao ON imoveis(situacao);`);
  pgm.sql(`CREATE TRIGGER trg_imoveis_updated BEFORE UPDATE ON imoveis
           FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
}

/** @param {MigrationBuilder} pgm */
export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS imoveis;`);
  pgm.sql(`DROP TABLE IF EXISTS cliente_contabil;`);
  pgm.sql(`DELETE FROM alteracoes WHERE setor = 'contabil';`);
  pgm.sql(`ALTER TABLE alteracoes DROP COLUMN setor;`);
  for (const tabela of TABELAS_COM_SETOR) {
    pgm.sql(`DELETE FROM ${tabela} WHERE setor = 'contabil';`);
    pgm.sql(`ALTER TABLE ${tabela} DROP COLUMN setor;`);
  }
}
