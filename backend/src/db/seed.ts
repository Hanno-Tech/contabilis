/**
 * Carga inicial (RF-IMPORT, parcial) a partir das planilhas de exemplo:
 *   - Exemplo visão geral.xlsx  -> clientes (2 registros)
 *
 * A convenção é texto livre na ficha do cliente (não há mais cadastro de CCT).
 * Datas que na planilha aparecem como "serial" do Excel (ex.: 47421) são
 * convertidas para data real. Execute com:  npm run seed
 */
import { db, closeDb } from './index.js';
import { encrypt } from '../lib/crypto.js';

/** Converte o número de série de data do Excel em 'YYYY-MM-DD'. */
function excelToISO(serial: number): string {
  const ms = (serial - 25569) * 86400 * 1000; // epoch Excel (1899-12-30) -> Unix
  return new Date(ms).toISOString().slice(0, 10);
}

async function reset() {
  // Ordem respeita as FKs.
  await db.deleteFrom('cliente_credenciais').execute();
  await db.deleteFrom('cliente_sindicatos').execute();
  await db.deleteFrom('cliente_folha').execute();
  await db.deleteFrom('clientes').execute();
}


async function seedClientes() {
  const dixem = await db
    .insertInto('clientes')
    .values({
      codigo: 187,
      nome: 'DIXEM IMPORTACAO E EXPORTACAO LTDA',
      cnpj: '25.307.302/0001-38',
      tipo_cliente: 'Empresa normal',
      regime_tributacao: 'Lucro Real',
      situacao: 'Ativa',
      data_evento_situacao: null,
      responsavel: 'Gisele',
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  await db
    .insertInto('cliente_folha')
    .values({
      cliente_id: dixem.id,
      possui_folha: 'Possui apenas folha',
      forma_pagamento_salarios: 'Dinheiro',
      apura_ponto_escritorio: 'Não',
      realiza_lancamentos: 'Sim',
      concede_plano_saude: 'Sim',
      plano_operadora: '8 - Unimed',
      plano_beneficiarios: 'Colaborador e Dependente',
      fator_r: 'Não se aplica',
      atividade_concomitante: 'Não se aplica',
      construcao_civil: 'Não',
      cprb: 'Não se aplica',
      observacoes_folha:
        'Lança horas extras. Lança desconto de plano de saúde. Enviar arquivo bancário mensalmente para o Marcos (data de pagamento 5º dia útil). Enviar folhas para os colaboradores via portal do cliente. Verificar início do desconto da Unimed (após a experiência). AO GERAR FÉRIAS, OBSERVAR A PLANILHA 187-CONTROLE DE FÉRIAS.',
      prazo_envio_folhas: '1º dia útil',
      relatorios_admissao:
        'Relatórios > Cadastrais > Admissionais. Gerar: Acordo de compensação de horas (modelo 3, "indeterminado"); Contrato de experiência (modelo 1); Autorização de desconto (modelo 1, rubricas 202, 203 e 9383); Declaração renúncia vale transporte (modelo 1); Ficha de Registro de empregado (modelo 1); Termo de consentimento LGPD (modelo 1). Emitir relatório do eSocial (histórico de movimentações trabalhistas).',
      envio_meio: 'E-mail (Gestta processos)',
      envio_documento: 'Folhas e Guias',
      envio_contato:
        'Folhas: portal do empregado (Domínio) e marcos@dixem.com.br, alessandro@dixem.com.br. Arquivo bancário: marcos@dixem.com.br, alessandro@dixem.com.br. Guias (IRRF, INSS residual, FGTS): financeiro@dixem.com.br.',
      sindicato: 'Sindicato do Comércio Varejista e Atacadista de Criciúma e Região',
      convencao_aplicavel_nome: 'Comércio de Içara, Morro da Fumaça e Balneário Rincão',
      possui_laudos_sst: 'Sim',
      empresa_responsavel_sst: 'Medset',
      data_vencimento_laudo: null,
      venc_procuracao_rfb: excelToISO(47421),
      venc_procuracao_det_fgts: excelToISO(47167),
      venc_procuracao_econsignado: excelToISO(46139),
      emails_notificacao_det: 'gisele@contabilis.net',
      inss_nit: 'Não se aplica',
      inss_codigo_recolhimento: 'Não se aplica',
      inss_salario_contribuicao: null,
      inss_aliquota: null,
    })
    .execute();

  await db
    .insertInto('cliente_credenciais')
    .values({
      cliente_id: dixem.id,
      tipo: 'seguro_desemprego',
      usuario: 'DIXEMIMPOR',
      senha_cipher: encrypt('nL3G66R049'),
      email: 'importacaoeexportacaodixem@gmail.com',
      email_senha_cipher: null,
    })
    .execute();

  const portabilis = await db
    .insertInto('clientes')
    .values({
      codigo: 92,
      nome: 'PORTABILIS TECNOLOGIA LTDA',
      cnpj: '11.258.607/0001-92',
      tipo_cliente: 'Empresa normal',
      regime_tributacao: 'Lucro Real',
      situacao: 'Ativa',
      responsavel: 'Gisele',
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  await db
    .insertInto('cliente_folha')
    .values({
      cliente_id: portabilis.id,
      possui_folha: 'Possui folha e pró labore',
      forma_pagamento_salarios: 'Dinheiro',
      apura_ponto_escritorio: 'Não',
      realiza_lancamentos: 'Sim',
      concede_plano_saude: 'Sim',
      plano_operadora: '8 - Unimed',
      plano_beneficiarios: 'Colaborador e Dependente',
      fator_r: 'Não',
      atividade_concomitante: 'Não',
      construcao_civil: 'Não',
      cprb: 'Não se aplica',
      observacoes_folha:
        'Envia planilha de lançamentos para importar. Enviar extrato para Luana aprovar. Enviar recibos de pagamento para o e-mail dos colaboradores (via Domínio Sistemas).',
      prazo_envio_folhas: '1º dia útil',
      relatorios_admissao:
        'Relatórios > Cadastrais > Admissionais: Ficha de Registro de empregado (modelo 1). Contrato de trabalho específico em Relatórios > Gerenciador de relatórios > Admissão > "Contrato de Trabalho Portabilis".',
      envio_meio: 'E-mail (Gestta processos)',
      envio_documento: 'Folhas e Guias',
      envio_contato:
        'financeiro@portabilis.com.br; scheila@portabilis.com.br. As folhas devem ser encaminhadas aos colaboradores via portal do cliente.',
      sindicato: 'SINDPD/SC - Sindicato dos Empregados em Empresas de Processamento de Dados de SC',
      convencao_aplicavel_nome: 'Processamento de dados',
      possui_laudos_sst: 'Sim',
      empresa_responsavel_sst: 'Maxipas',
      venc_procuracao_rfb: excelToISO(46691),
      venc_procuracao_det_fgts: excelToISO(47134),
      venc_procuracao_econsignado: excelToISO(46301),
      emails_notificacao_det: 'gisele@contabilis.net',
      inss_nit: 'Não se aplica',
      inss_codigo_recolhimento: 'Não se aplica',
      inss_salario_contribuicao: null,
      inss_aliquota: null,
    })
    .execute();

  await db
    .insertInto('cliente_credenciais')
    .values({
      cliente_id: portabilis.id,
      tipo: 'seguro_desemprego',
      usuario: '11258607000192',
      senha_cipher: encrypt('CONTMINOTTO'),
      email: null,
      email_senha_cipher: null,
    })
    .execute();
}

async function main() {
  console.log('Limpando dados...');
  await reset();
  console.log('Inserindo clientes...');
  await seedClientes();
  console.log('Seed concluído com sucesso.');
}

main()
  .catch((err) => {
    console.error('Falha no seed:', err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
