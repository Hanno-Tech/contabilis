/**
 * Importador da planilha "Visão Geral (Setor Pessoal)".
 *
 * Carga inicial da carteira de clientes a partir do .xlsx mantido pelo setor.
 * Limpa a tabela `clientes` e recarrega tudo da planilha — ver `--force` abaixo
 * antes de rodar em um banco que já esteja em uso.
 *
 * Uso:
 *   npm run import:clientes -- --file "../FRPes-001 Visão Geral (Setor Pessoal) - AJUSTADA.xlsx"
 *
 * Flags:
 *   --file <caminho>  planilha a importar (obrigatório)
 *   --aba <nome>      aba a ler (padrão: a primeira que começar com "Visão Geral")
 *   --dry-run         só analisa e relata, sem gravar nada
 *   --force           autoriza apagar ocorrências/pendências/eventos existentes,
 *                     que caem junto por CASCADE ao remover os clientes
 *
 * Decisões de mapeamento (acordadas com o setor):
 *   - linhas sem CÓDIGO DA EMPRESA não são importadas — são listadas no fim
 *     para cadastro manual;
 *   - código repetido: vale a última linha da planilha;
 *   - texto em coluna de data ("Sem Procuração", "Não se aplica", "EXPIRADA")
 *     vira vazio; o relatório final conta quantos foram por coluna;
 *   - SALÁRIO DE CONTRIBUIÇÃO é numérico no banco e textual na planilha
 *     ("Um salário mínimo vigente"), então não é importado — também relatado.
 */
import 'dotenv/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import XLSX from 'xlsx';
import { closeDb, db } from './index.js';
import { encrypt } from '../lib/crypto.js';

// ---------------------------------------------------------------- utilidades

function argValor(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const temFlag = (flag: string) => process.argv.includes(flag);

/** Converte o número de série de data do Excel em 'YYYY-MM-DD'. */
function excelParaISO(serial: number): string | null {
  // Faixa defensiva: 1990-01-01 (32874) a 2100-01-01 (73051).
  if (!Number.isFinite(serial) || serial < 32874 || serial > 73051) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000); // epoch Excel -> Unix
  return new Date(ms).toISOString().slice(0, 10);
}

type Celula = string | number | boolean | Date | null | undefined;

/** Texto limpo, ou null quando a célula está vazia. */
function texto(v: Celula): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s === '' ? null : s;
}

/**
 * Data em 'YYYY-MM-DD'. A planilha usa a mesma coluna para data e para
 * sentinelas textuais ("Sem Procuração", "Não se aplica"); o texto não cabe em
 * uma coluna `date`, então retorna null e devolve o texto para o relatório.
 */
function data(v: Celula): { valor: string | null; textoIgnorado: string | null } {
  if (v === null || v === undefined || v === '') return { valor: null, textoIgnorado: null };
  if (v instanceof Date) return { valor: v.toISOString().slice(0, 10), textoIgnorado: null };
  if (typeof v === 'number') return { valor: excelParaISO(v), textoIgnorado: null };

  const s = String(v).trim();
  // Datas digitadas como texto: "01/11/2025" ou "01/11/2025 - observação".
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return { valor: `${m[3]}-${m[2]}-${m[1]}`, textoIgnorado: s.length > 10 ? s : null };
  return { valor: null, textoIgnorado: s };
}

/** Número em string (o banco guarda numeric como string, sem perder precisão). */
function numero(v: Celula): { valor: string | null; textoIgnorado: string | null } {
  if (v === null || v === undefined || v === '') return { valor: null, textoIgnorado: null };
  if (typeof v === 'number') return { valor: String(v), textoIgnorado: null };
  const s = String(v).trim();
  const normalizado = s.replace(/\./g, '').replace(',', '.');
  if (/^-?\d+(\.\d+)?$/.test(normalizado)) return { valor: normalizado, textoIgnorado: null };
  return { valor: null, textoIgnorado: s };
}

/**
 * Identificadores longos (NIT/PIS) chegam como número e viram notação
 * científica se passarem por String() sem cuidado.
 */
function identificador(v: Celula): string | null {
  if (typeof v === 'number') return v.toFixed(0);
  return texto(v);
}

/** "Não se aplica" e afins não são credencial — não geram registro no cofre. */
const VAZIOS = new Set([
  'não se aplica',
  'nao se aplica',
  'não de aplica', // erro de digitação presente na planilha
  'nao de aplica',
  'não possui',
  'nao possui',
  'sem procuração',
  'sem procuracao',
  '-',
  '',
]);

function preenchido(v: string | null): string | null {
  if (v === null) return null;
  return VAZIOS.has(v.toLowerCase()) ? null : v;
}

// ------------------------------------------------------------------- colunas

/**
 * Índices das colunas na planilha (linha 6 de cabeçalho, com subtítulos na 7).
 * Conferidos contra o arquivo de 30.05.2026 — se a planilha mudar de forma,
 * `validarCabecalho` acusa antes de importar qualquer coisa.
 */
const COL = {
  codigo: 0, // A  CÓDIGO DA EMPRESA
  nome: 1, // B  NOME
  cnpj: 2, // C  CNPJ
  tipo_cliente: 3, // D  TIPO DE CLIENTE
  regime: 4, // E  REGIME DE TRIBUTAÇÃO
  situacao: 5, // F  SITUAÇÃO
  data_evento: 6, // G  DATA DO EVENTO DA SITUAÇÃO
  responsavel: 7, // H  RESPONSÁVEL
  possui_folha: 8, // I  POSSUI FOLHA DE PAGAMENTO?
  forma_pagamento: 9, // J  FORMA DE PAGAMENTO DOS SALÁRIOS
  apura_ponto: 10, // K  APURA O PONTO PELO ESCRITÓRIO?
  realiza_lancamentos: 11, // L  REALIZA LANÇAMENTOS?
  plano_concede: 12, // M  CONCEDE PLANO DE SAÚDE?
  plano_operadora: 13, // N  OPERADORA DO PLANO
  plano_beneficiarios: 14, // O  BENEFICIÁRIOS
  fator_r: 15, // P  FATOR "R"?
  atividade_concomitante: 16, // Q  ATIVIDADE CONCOMITANTE?
  construcao_civil: 17, // R  CONSTRUÇÃO CIVIL?
  cprb: 18, // S  CPRB?
  observacoes_folha: 19, // T  OBSERVAÇÕES IMPORTANTES SOBRE A FOLHA
  prazo_envio_folhas: 20, // U  PRAZO PARA ENVIO DAS FOLHAS
  rotina_automatica: 21, // V  Calcula e gera a folha via rotina automática?
  relatorios_admissao: 22, // W  RELATÓRIOS GERADOS NA ADMISSÃO
  envio_meio: 23, // X  MEIO
  envio_documento: 24, // Y  DOCUMENTO
  envio_contato: 25, // Z  CONTATO
  sindicato: 26, // AA SINDICATO AO QUAL ESTÁ SUJEITO
  convencao: 27, // AB CONVENÇÃO APLICÁVEL
  possui_laudos_sst: 28, // AC POSSUI LAUDOS DE SST?
  empresa_sst: 29, // AD EMPRESA RESPONSÁVEL PELA SST
  proc_rfb: 30, // AE PRAZO DE VENCIMENTO PROCURAÇÃO RFB
  proc_det_fgts: 31, // AF PRAZO DE VENCIMENTO PROCURAÇÃO DET E FGTS DIGITAL
  proc_econsignado: 32, // AG PRAZO DE VENCIMENTO PROCURAÇÃO E-CONSIGNADO
  emails_det: 33, // AH EMAILS QUE RECEBEM A NOTIFICAÇÃO DO DET
  sd_usuario: 34, // AI USUÁRIO (seguro desemprego)
  sd_senha: 35, // AJ SENHA
  sd_email: 36, // AK E-MAIL CLIENTE SD
  sd_email_senha: 37, // AL SENHA E-MAIL CLIENTE SD
  inss_nit: 38, // AM NIT
  inss_cod_recolhimento: 39, // AN CÓDIGO DE RECOLHIMENTO
  inss_salario: 40, // AO SALÁRIO DE CONTRIBUIÇÃO
  inss_aliquota: 41, // AP ALÍQUOTA
  ed_usuario: 42, // AQ USUÁRIO (empregado doméstico)
  ed_senha: 43, // AR SENHA
} as const;

/** Trechos esperados no cabeçalho, para detectar planilha fora do formato. */
const CABECALHO_ESPERADO: Array<[number, string]> = [
  [COL.codigo, 'CÓDIGO DA EMPRESA'],
  [COL.nome, 'NOME'],
  [COL.cnpj, 'CNPJ'],
  [COL.situacao, 'SITUAÇÃO'],
  [COL.responsavel, 'RESPONSÁVEL'],
  [COL.proc_rfb, 'PROCURAÇÃO RFB'],
  [COL.inss_nit, 'NIT'],
  [COL.ed_senha, 'SENHA'],
];

const LINHA_CABECALHO = 5; // índice 0 (linha 6 do Excel)
const LINHA_SUBTITULOS = 6;
const PRIMEIRA_LINHA_DADOS = 7;

function validarCabecalho(linhas: Celula[][]): void {
  const principal = linhas[LINHA_CABECALHO] ?? [];
  const subtitulos = linhas[LINHA_SUBTITULOS] ?? [];
  const erros: string[] = [];

  for (const [idx, esperado] of CABECALHO_ESPERADO) {
    const achado = texto(principal[idx]) ?? texto(subtitulos[idx]) ?? '';
    const normaliza = (s: string) => s.toUpperCase().replace(/[^A-ZÀ-Ú]/g, '');
    if (!normaliza(achado).includes(normaliza(esperado))) {
      erros.push(
        `  coluna ${XLSX.utils.encode_col(idx)}: esperado "${esperado}", encontrado "${achado}"`,
      );
    }
  }

  if (erros.length) {
    throw new Error(
      'O cabeçalho da planilha não bate com o formato esperado — o mapeamento de\n' +
        'colunas em import-clientes.ts precisa ser revisto antes de importar:\n' +
        erros.join('\n'),
    );
  }
}

// ------------------------------------------------------------------ relatório

interface Relatorio {
  totalLinhas: number;
  importados: number;
  semCodigo: Array<{ linha: number; nome: string; valorBruto: string | null }>;
  duplicados: Array<{ codigo: number; nome: string; linhas: number[] }>;
  /** Textos descartados por coluna: coluna -> texto -> quantidade. */
  textoEmData: Map<string, Map<string, number>>;
  salarioDescartado: Array<{ codigo: number; nome: string; valor: string }>;
  credenciaisSD: number;
  credenciaisED: number;
  sindicatos: number;
}

function registraDescarte(rel: Relatorio, coluna: string, valor: string | null): void {
  if (!valor) return;
  const porColuna = rel.textoEmData.get(coluna) ?? new Map<string, number>();
  porColuna.set(valor, (porColuna.get(valor) ?? 0) + 1);
  rel.textoEmData.set(coluna, porColuna);
}

// -------------------------------------------------------------------- leitura

interface LinhaCliente {
  linhaExcel: number;
  codigo: number;
  celulas: Celula[];
}

function lerPlanilha(caminho: string, abaPedida?: string) {
  const wb = XLSX.readFile(caminho, { cellDates: false });

  const nomeAba =
    abaPedida ??
    wb.SheetNames.find((n) => n.toLowerCase().startsWith('visão geral')) ??
    wb.SheetNames[0];

  const ws = wb.Sheets[nomeAba];
  if (!ws) {
    throw new Error(
      `Aba "${nomeAba}" não encontrada. Abas disponíveis: ${wb.SheetNames.join(', ')}`,
    );
  }

  const linhas = XLSX.utils.sheet_to_json<Celula[]>(ws, {
    header: 1,
    blankrows: false,
    defval: null,
  });

  return { nomeAba, linhas };
}

// ------------------------------------------------------------------ gravação

async function limparClientes(force: boolean): Promise<void> {
  // Tudo que aponta para `clientes` cai por CASCADE — inclusive o trabalho já
  // lançado pela equipe, que não vem da planilha. Não dá para apagar isso sem
  // o usuário saber.
  const dependentes = await Promise.all(
    (['ocorrencias', 'pendencias', 'eventos_futuros'] as const).map(async (tabela) => {
      const r = await db
        .selectFrom(tabela)
        .select(({ fn }) => fn.countAll<string>().as('n'))
        .executeTakeFirst();
      return { tabela, n: Number(r?.n ?? 0) };
    }),
  );

  const comDados = dependentes.filter((d) => d.n > 0);
  if (comDados.length && !force) {
    throw new Error(
      'O banco tem registros que seriam apagados junto com os clientes (CASCADE):\n' +
        comDados.map((d) => `  ${d.tabela}: ${d.n} registro(s)`).join('\n') +
        '\n\nEsses dados não vêm da planilha e não seriam recriados pela importação.\n' +
        'Se puderem ser descartados, rode de novo com --force.',
    );
  }

  await db.deleteFrom('clientes').execute();
}

/**
 * Converte uma linha da planilha nos valores que vão para o banco, alimentando
 * o relatório no caminho. Fica separado da gravação para que `--dry-run` relate
 * exatamente o que a importação de verdade faria.
 */
function analisar(l: LinhaCliente, rel: Relatorio) {
  const c = l.celulas;
  const nome = texto(c[COL.nome])!;

  const dataEvento = data(c[COL.data_evento]);
  const procRfb = data(c[COL.proc_rfb]);
  const procDetFgts = data(c[COL.proc_det_fgts]);
  const procEconsig = data(c[COL.proc_econsignado]);
  registraDescarte(rel, 'DATA DO EVENTO DA SITUAÇÃO', dataEvento.textoIgnorado);
  registraDescarte(rel, 'PROCURAÇÃO RFB', procRfb.textoIgnorado);
  registraDescarte(rel, 'PROCURAÇÃO DET E FGTS', procDetFgts.textoIgnorado);
  registraDescarte(rel, 'PROCURAÇÃO E-CONSIGNADO', procEconsig.textoIgnorado);

  const aliquota = numero(c[COL.inss_aliquota]);
  const salario = numero(c[COL.inss_salario]);
  if (salario.textoIgnorado && preenchido(salario.textoIgnorado)) {
    rel.salarioDescartado.push({ codigo: l.codigo, nome, valor: salario.textoIgnorado });
  }

  const sindicato = preenchido(texto(c[COL.sindicato]));
  const convencao = preenchido(texto(c[COL.convencao]));
  if (sindicato || convencao) rel.sindicatos++;

  const sd = {
    usuario: preenchido(texto(c[COL.sd_usuario])),
    senha: preenchido(texto(c[COL.sd_senha])),
    email: preenchido(texto(c[COL.sd_email])),
    emailSenha: preenchido(texto(c[COL.sd_email_senha])),
  };
  const temSD = Boolean(sd.usuario || sd.senha || sd.email || sd.emailSenha);
  if (temSD) rel.credenciaisSD++;

  const ed = {
    usuario: preenchido(texto(c[COL.ed_usuario])),
    senha: preenchido(texto(c[COL.ed_senha])),
  };
  const temED = Boolean(ed.usuario || ed.senha);
  if (temED) rel.credenciaisED++;

  rel.importados++;

  return { nome, dataEvento, procRfb, procDetFgts, procEconsig, aliquota, salario, sindicato, convencao, sd, temSD, ed, temED };
}

async function gravarCliente(l: LinhaCliente, rel: Relatorio): Promise<void> {
  const c = l.celulas;
  const a = analisar(l, rel);
  const { nome, dataEvento } = a;

  const cliente = await db
    .insertInto('clientes')
    .values({
      codigo: l.codigo,
      nome,
      cnpj: texto(c[COL.cnpj]),
      tipo_cliente: texto(c[COL.tipo_cliente]),
      regime_tributacao: texto(c[COL.regime]),
      // `situacao` é NOT NULL; a planilha tem uma linha em branco.
      situacao: texto(c[COL.situacao]) ?? 'Ativa',
      data_evento_situacao: dataEvento.valor,
      responsavel: texto(c[COL.responsavel]),
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  await db
    .insertInto('cliente_folha')
    .values({
      cliente_id: cliente.id,
      possui_folha: texto(c[COL.possui_folha]),
      forma_pagamento_salarios: texto(c[COL.forma_pagamento]),
      apura_ponto_escritorio: texto(c[COL.apura_ponto]),
      realiza_lancamentos: texto(c[COL.realiza_lancamentos]),
      concede_plano_saude: texto(c[COL.plano_concede]),
      plano_operadora: texto(c[COL.plano_operadora]),
      plano_beneficiarios: texto(c[COL.plano_beneficiarios]),
      fator_r: texto(c[COL.fator_r]),
      atividade_concomitante: texto(c[COL.atividade_concomitante]),
      construcao_civil: texto(c[COL.construcao_civil]),
      cprb: texto(c[COL.cprb]),
      observacoes_folha: texto(c[COL.observacoes_folha]),
      prazo_envio_folhas: texto(c[COL.prazo_envio_folhas]),
      folha_rotina_automatica: texto(c[COL.rotina_automatica]),
      relatorios_admissao: texto(c[COL.relatorios_admissao]),
      envio_meio: texto(c[COL.envio_meio]),
      envio_documento: texto(c[COL.envio_documento]),
      envio_contato: texto(c[COL.envio_contato]),
      sindicato: texto(c[COL.sindicato]),
      convencao_aplicavel_nome: texto(c[COL.convencao]),
      possui_laudos_sst: texto(c[COL.possui_laudos_sst]),
      empresa_responsavel_sst: texto(c[COL.empresa_sst]),
      venc_procuracao_rfb: a.procRfb.valor,
      venc_procuracao_det_fgts: a.procDetFgts.valor,
      venc_procuracao_econsignado: a.procEconsig.valor,
      emails_notificacao_det: texto(c[COL.emails_det]),
      inss_nit: identificador(c[COL.inss_nit]),
      inss_codigo_recolhimento: identificador(c[COL.inss_cod_recolhimento]),
      inss_salario_contribuicao: a.salario.valor,
      inss_aliquota: a.aliquota.valor,
    })
    .execute();

  // Sindicato / convenção: a ficha aceita vários, a planilha traz um.
  if (a.sindicato || a.convencao) {
    await db
      .insertInto('cliente_sindicatos')
      .values({
        cliente_id: cliente.id,
        sindicato: a.sindicato,
        convencao_aplicavel_nome: a.convencao,
      })
      .execute();
  }

  // Cofre de credenciais — só grava quando há credencial de verdade.
  if (a.temSD) {
    await db
      .insertInto('cliente_credenciais')
      .values({
        cliente_id: cliente.id,
        tipo: 'seguro_desemprego',
        usuario: a.sd.usuario,
        senha_cipher: encrypt(a.sd.senha),
        email: a.sd.email,
        email_senha_cipher: encrypt(a.sd.emailSenha),
      })
      .execute();
  }

  if (a.temED) {
    await db
      .insertInto('cliente_credenciais')
      .values({
        cliente_id: cliente.id,
        tipo: 'empregado_domestico',
        usuario: a.ed.usuario,
        senha_cipher: encrypt(a.ed.senha),
      })
      .execute();
  }
}

// ----------------------------------------------------------------- relatório

function imprimirRelatorio(rel: Relatorio, dryRun: boolean): void {
  const linha = '='.repeat(66);
  console.log('\n' + linha);
  console.log(dryRun ? 'SIMULAÇÃO (--dry-run) — nada foi gravado' : 'IMPORTAÇÃO CONCLUÍDA');
  console.log(linha);
  console.log(`Linhas de dados na planilha : ${rel.totalLinhas}`);
  console.log(`Clientes importados         : ${rel.importados}`);
  console.log(`Sindicatos/convenções       : ${rel.sindicatos}`);
  console.log(`Credenciais seguro-desemprego: ${rel.credenciaisSD}`);
  console.log(`Credenciais empregado dom.  : ${rel.credenciaisED}`);

  if (rel.semCodigo.length) {
    console.log(
      `\n⚠ ${rel.semCodigo.length} linha(s) sem CÓDIGO DA EMPRESA válido — não importadas.`,
    );
    console.log('  Cadastre manualmente, atribuindo um código:');
    for (const s of rel.semCodigo) {
      const bruto = s.valorBruto === null ? 'em branco' : `"${s.valorBruto}"`;
      console.log(`    linha ${s.linha}: ${s.nome}  (código ${bruto})`);
    }
  }

  if (rel.duplicados.length) {
    console.log(`\n⚠ ${rel.duplicados.length} código(s) repetido(s) — valeu a última linha:`);
    for (const d of rel.duplicados) {
      console.log(`    ${d.codigo} ${d.nome} (linhas ${d.linhas.join(', ')})`);
    }
  }

  if (rel.textoEmData.size) {
    console.log('\nTexto em coluna de data — gravado como vazio:');
    for (const [coluna, valores] of rel.textoEmData) {
      const total = [...valores.values()].reduce((a, b) => a + b, 0);
      console.log(`  ${coluna} — ${total} célula(s):`);
      for (const [valor, n] of [...valores.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`      ${String(n).padStart(4)}x  ${valor}`);
      }
    }
  }

  if (rel.salarioDescartado.length) {
    console.log(
      `\nSALÁRIO DE CONTRIBUIÇÃO — ${rel.salarioDescartado.length} valor(es) textual(is) não` +
        ' importados (a coluna é numérica no banco):',
    );
    for (const s of rel.salarioDescartado) {
      console.log(`    ${s.codigo} ${s.nome}: "${s.valor}"`);
    }
  }

  console.log(linha);
}

// --------------------------------------------------------------------- main

async function run() {
  const caminhoArg = argValor('--file');
  if (!caminhoArg) {
    throw new Error('Informe a planilha: --file "<caminho do .xlsx>"');
  }
  const caminho = resolve(caminhoArg);
  if (!existsSync(caminho)) throw new Error(`Arquivo não encontrado: ${caminho}`);

  const dryRun = temFlag('--dry-run');
  const { nomeAba, linhas } = lerPlanilha(caminho, argValor('--aba'));
  console.log(`Planilha: ${caminho}`);
  console.log(`Aba     : ${nomeAba}\n`);

  validarCabecalho(linhas);

  // Uma linha é de dados quando tem código ou nome — a planilha tem faixas
  // vazias e linhas de formatação no meio.
  const brutas = linhas
    .map((celulas, i) => ({ celulas, linhaExcel: i + 1 }))
    .slice(PRIMEIRA_LINHA_DADOS)
    .filter(({ celulas }) => texto(celulas[COL.codigo]) !== null || texto(celulas[COL.nome]) !== null);

  const rel: Relatorio = {
    totalLinhas: brutas.length,
    importados: 0,
    semCodigo: [],
    duplicados: [],
    textoEmData: new Map(),
    salarioDescartado: [],
    credenciaisSD: 0,
    credenciaisED: 0,
    sindicatos: 0,
  };

  // Código repetido: vale a última linha. Guarda as anteriores para o relatório.
  const porCodigo = new Map<number, LinhaCliente>();
  const linhasVistas = new Map<number, number[]>();

  for (const { celulas, linhaExcel } of brutas) {
    const nome = texto(celulas[COL.nome]);
    const codigoTexto = texto(celulas[COL.codigo]);
    const codigo = codigoTexto === null ? NaN : Number(codigoTexto);

    if (!nome) continue; // linha de formatação sem conteúdo
    if (!Number.isInteger(codigo)) {
      rel.semCodigo.push({ linha: linhaExcel, nome, valorBruto: codigoTexto });
      continue;
    }

    linhasVistas.set(codigo, [...(linhasVistas.get(codigo) ?? []), linhaExcel]);
    porCodigo.set(codigo, { linhaExcel, codigo, celulas });
  }

  for (const [codigo, linhasDoCodigo] of linhasVistas) {
    if (linhasDoCodigo.length > 1) {
      rel.duplicados.push({
        codigo,
        nome: texto(porCodigo.get(codigo)!.celulas[COL.nome]) ?? '',
        linhas: linhasDoCodigo,
      });
    }
  }

  const clientes = [...porCodigo.values()].sort((a, b) => a.codigo - b.codigo);

  if (dryRun) {
    // Mesma análise da importação real, sem tocar no banco.
    for (const l of clientes) analisar(l, rel);
    imprimirRelatorio(rel, true);
    return;
  }

  console.log('Limpando os clientes existentes...');
  await limparClientes(temFlag('--force'));

  console.log(`Importando ${clientes.length} cliente(s)...`);
  for (const l of clientes) {
    try {
      await gravarCliente(l, rel);
    } catch (err) {
      throw new Error(
        `Falha na linha ${l.linhaExcel} (código ${l.codigo}): ` +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  }

  imprimirRelatorio(rel, false);
}

run()
  .catch((err) => {
    console.error('\n✖ ' + (err instanceof Error ? err.message : String(err)));
    process.exitCode = 1;
  })
  .finally(() => closeDb());
