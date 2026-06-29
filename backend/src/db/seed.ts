/**
 * Carga inicial (RF-IMPORT, parcial) a partir das planilhas de exemplo:
 *   - Exemplo visão geral.xlsx  -> clientes (2 registros)
 *   - CCT.xlsx                  -> 1 convenção coletiva
 *
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
  await db.deleteFrom('clientes').execute();
  await db.deleteFrom('convencao_pisos').execute();
  await db.deleteFrom('convencao_regras').execute();
  await db.deleteFrom('convencoes').execute();
}

async function seedConvencao() {
  const cct = await db
    .insertInto('convencoes')
    .values({
      apelido: 'Sindicato dos Transportes de Criciúma',
      sindicato_patronal:
        'Sindicato das empresas de transporte de cargas e logística do sul de Santa Catarina – SETRANSC.',
      sindicato_laboral:
        'Sindicato Condutores de Veículos e trabalhadores do transporte rodoviário de cargas e passageiros de Criciúma',
      situacao: 'Vigente',
      vigencia_inicio: '2025-09-01',
      vigencia_fim: '2026-08-31',
      data_expiracao: excelToISO(46265),
      adicional_noturno: '0.25',
      he_dias_normais: '0.60',
      he_domingos_feriados: '1.00',
      he_observacoes:
        '1) Quantidade máxima de horas extras diárias é de 4 horas (o normal é apenas 2, mas para essa classe permite-se 4).\n' +
        '2) É permitido às pessoas que exercem atividades insalubres a realização de horas extras, desde que o empregado concorde por escrito.',
      contatos_sindicato: 'Ver com o sindicato.',
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  const pisos: Array<[string, number]> = [
    ['Motorista de viagem', 2673.15],
    ['Motorista de coleta e entrega até 150km', 2111.94],
    ['Motoboy', 1970.66],
    ['Ajudantes de carga e descarga de mercadorias e demais empregados', 1787.85],
    ['Office-boys e pessoal de limpeza', 1787.85],
  ];
  await db
    .insertInto('convencao_pisos')
    .values(pisos.map(([funcao, valor], i) => ({ convencao_id: cct.id, funcao, valor: String(valor), ordem: i })))
    .execute();

  const regras: Array<{ categoria: string; titulo?: string; conteudo: string }> = [
    {
      categoria: 'INSALUBRIDADE/PERICULOSIDADE',
      conteudo: 'Conforme Laudos de SST.',
    },
    {
      categoria: 'COMPENSAÇÃO DE JORNADA E HORAS EXTRAS',
      conteudo: 'Dispensa formalidades junto ao sindicato.',
    },
    {
      categoria: 'BANCO DE HORAS',
      conteudo:
        '1) Pode ser feito sem formalidades por um prazo de 60 dias.\n' +
        '2) As primeiras e segundas horas extras realizadas no dia poderão ser depositadas no banco de horas; o que exceder deve ser pago na folha do mês.\n' +
        '3) Ao final do período de compensação (60 dias), saldo positivo deve ser lançado como horas extras com acréscimo de 60%.\n' +
        '4) Desligamento por iniciativa da empresa: saldo negativo não pode ser descontado do colaborador.\n' +
        '5) Desligamento por iniciativa da empresa: saldo positivo deve ser pago com acréscimo de 60%.',
    },
    {
      categoria: 'AVISO PRÉVIO',
      titulo: 'Empregados com mais de 5 anos e mais de 50 anos de idade',
      conteudo:
        'Acréscimo de 30 dias ao aviso legal, limitado a 90 dias no total. Aplica-se também ao aviso prévio indenizado.',
    },
    {
      categoria: 'AVISO PRÉVIO',
      titulo: 'Demais empregados',
      conteudo: 'Regra geral da CLT.',
    },
    {
      categoria: 'CONTROLE DE JORNADA',
      conteudo:
        '1) Obrigatório para empresas com mais de 10 empregados em serviços internos de oficina e escritório.\n' +
        '2) Serviços externos controlados por ponto eletrônico ou ficha de controle de horário externo.',
    },
    {
      categoria: 'GARANTIAS DE EMPREGO (ESTABILIDADE)',
      titulo: 'Acidente de trabalho / auxílio-doença / gestante / pré-aposentadoria',
      conteudo:
        'Retorno de acidente de trabalho: 12 meses (CLT). Retorno de auxílio-doença: até 60 dias após cessação. Gestante: da concepção até 150 dias após o parto. Pré-aposentadoria: 12 meses, exige +5 anos na mesma empresa e comunicação ao empregador.',
    },
    {
      categoria: 'FALTAS JUSTIFICADAS',
      titulo: 'Empregado estudante',
      conteudo:
        'Pode faltar para exames escolares/vestibulares, com comunicação prévia de até 72 horas e comprovação posterior.',
    },
    {
      categoria: 'ATESTADOS MÉDICOS',
      conteudo: 'Segue regra geral, sem observações.',
    },
    {
      categoria: 'CONTRIBUIÇÕES AOS SINDICATOS',
      titulo: 'Taxa assistencial negocial ao sindicato laboral',
      conteudo:
        'Desconto de 4% do salário base na folha de novembro/25, recolhido no mês seguinte. O empregado pode se opor por carta entregue na sede do sindicato até 25/11/2025.',
    },
    {
      categoria: 'CONTRIBUIÇÕES AOS SINDICATOS',
      titulo: 'Taxa assistencial ao sindicato patronal',
      conteudo:
        'R$ 1.000,00 em 4 parcelas de R$ 250,00, com vencimentos em 15/12/25, 15/01/26, 15/02/26 e 15/03/26. Possível oposição em até 10 dias após o registro da convenção.',
    },
    {
      categoria: 'DEMAIS SITUAÇÕES A OBSERVAR',
      titulo: 'Diárias (reembolso de despesas)',
      conteudo:
        'Motoristas que dormem fora: R$ 86,71. Demais que trabalharem +10h/dia: R$ 67,44. Demais motoristas: R$ 38,54. Ajudantes: mesmo valor do motorista.',
    },
    {
      categoria: 'DEMAIS SITUAÇÕES A OBSERVAR',
      titulo: 'Seguro de vida',
      conteudo: 'Seguro de vida em grupo conjugado com acidentes pessoais, valor inicial de R$ 50.000,00.',
    },
    {
      categoria: 'ASSISTÊNCIA SINDICAL NAS RESCISÕES',
      conteudo:
        'Obrigatória para empregados com mais de 6 meses de empresa. A reforma trabalhista dispensou a homologação.',
    },
  ];
  await db
    .insertInto('convencao_regras')
    .values(regras.map((r, i) => ({ convencao_id: cct.id, categoria: r.categoria, titulo: r.titulo ?? null, conteudo: r.conteudo, ordem: i })))
    .execute();

  return cct.id;
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
      convencao_id: null,
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
    .returning('id')
    .executeTakeFirstOrThrow();

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

  await db
    .insertInto('clientes')
    .values({
      codigo: 92,
      nome: 'PORTABILIS TECNOLOGIA LTDA',
      cnpj: '11.258.607/0001-92',
      tipo_cliente: 'Empresa normal',
      regime_tributacao: 'Lucro Real',
      situacao: 'Ativa',
      responsavel: 'Gisele',
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
      convencao_id: null,
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
    .returning('id')
    .executeTakeFirstOrThrow()
    .then((portabilis) =>
      db
        .insertInto('cliente_credenciais')
        .values({
          cliente_id: portabilis.id,
          tipo: 'seguro_desemprego',
          usuario: '11258607000192',
          senha_cipher: encrypt('CONTMINOTTO'),
          email: null,
          email_senha_cipher: null,
        })
        .execute(),
    );
}

async function main() {
  console.log('Limpando dados...');
  await reset();
  console.log('Inserindo convenção (CCT)...');
  await seedConvencao();
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
