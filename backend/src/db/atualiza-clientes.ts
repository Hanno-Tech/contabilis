/**
 * Atualização pontual de clientes a partir de uma planilha de complemento.
 *
 * Diferente do `import:clientes`, que limpa e recarrega tudo, este script
 * **sobrepõe apenas as colunas presentes na planilha**, casando os registros
 * pelo CÓDIGO DA EMPRESA. Qualquer campo que não seja uma coluna da planilha
 * fica intocado, assim como qualquer cliente que não apareça nela.
 *
 * Uso:
 *   npm run atualiza:clientes -- --file "../Inclusão de Dados - Teste 1.xlsx" --dry-run
 *   npm run atualiza:clientes -- --file "../Inclusão de Dados - Teste 1.xlsx"
 *
 * Flags:
 *   --file <caminho>     planilha (obrigatório)
 *   --aba <nome>         aba a ler (padrão: Planilha1)
 *   --dry-run            só relata o que mudaria
 *   --colunas A,B,C      importa somente estas colunas da planilha
 *   --exceto A,B,C       importa todas menos estas
 *   --limpar-em-branco   célula vazia apaga o valor no banco
 *                        (padrão: célula vazia preserva o que já existe)
 *   --backup <arquivo>   grava o estado atual dos campos afetados antes de
 *                        alterar, para permitir desfazer
 */
import 'dotenv/config';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { sql } from 'kysely';
import XLSX from 'xlsx';
import { closeDb, db } from './index.js';

// ---------------------------------------------------------------- utilidades

function argValor(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const temFlag = (flag: string) => process.argv.includes(flag);

type Celula = string | number | boolean | Date | null | undefined;

function texto(v: Celula): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s === '' ? null : s;
}

/** Serial do Excel -> 'YYYY-MM-DD'. Faixa defensiva: 1990..2100. */
function excelParaISO(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 32874 || serial > 73051) return null;
  return new Date(Math.round((serial - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
}

/**
 * Data em 'YYYY-MM-DD'. A planilha mistura data com sentinelas textuais
 * ("Sem Procuração", "Desobrigada"), que não cabem numa coluna `date`:
 * viram null e o texto sai no relatório.
 */
function data(v: Celula): { valor: string | null; textoIgnorado: string | null } {
  if (v === null || v === undefined || v === '') return { valor: null, textoIgnorado: null };
  if (v instanceof Date) return { valor: v.toISOString().slice(0, 10), textoIgnorado: null };
  if (typeof v === 'number') return { valor: excelParaISO(v), textoIgnorado: null };
  const s = String(v).trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return { valor: `${m[3]}-${m[2]}-${m[1]}`, textoIgnorado: s.length > 10 ? s : null };
  return { valor: null, textoIgnorado: s };
}

// ------------------------------------------------------------------- colunas

type Tabela = 'clientes' | 'cliente_folha';
type Tipo = 'texto' | 'data';

interface Coluna {
  letra: string;
  indice: number;
  titulo: string;
  tabela: Tabela;
  campo: string;
  tipo: Tipo;
}

/** Mapa planilha -> banco. A ordem é a das colunas na planilha. */
const COLUNAS: Coluna[] = [
  { letra: 'D', indice: 3, titulo: 'DATA DA SITUAÇÃO', tabela: 'clientes', campo: 'data_evento_situacao', tipo: 'data' },
  { letra: 'E', indice: 4, titulo: 'CONSTRUÇÃO CIVIL?', tabela: 'cliente_folha', campo: 'construcao_civil', tipo: 'texto' },
  { letra: 'F', indice: 5, titulo: 'CPRB?', tabela: 'cliente_folha', campo: 'cprb', tipo: 'texto' },
  { letra: 'G', indice: 6, titulo: 'INSS RETIDO NA NOTA?', tabela: 'cliente_folha', campo: 'inss_retido_nf', tipo: 'texto' },
  { letra: 'H', indice: 7, titulo: 'ENCARGOS RECOLHIDOS PELO ESCRITÓRIO?', tabela: 'cliente_folha', campo: 'encargos_recolhidos_escritorio', tipo: 'texto' },
  { letra: 'I', indice: 8, titulo: 'ESPECIFICIDADES DO CLIENTE', tabela: 'cliente_folha', campo: 'particularidades_cliente', tipo: 'texto' },
  { letra: 'J', indice: 9, titulo: 'RESPONSÁVEL PELO FECHAMENTO DA FOLHA', tabela: 'cliente_folha', campo: 'responsavel_fechamento_folha', tipo: 'texto' },
  { letra: 'K', indice: 10, titulo: 'PRAZO PARA ENVIO DAS FOLHAS', tabela: 'cliente_folha', campo: 'prazo_envio_folhas', tipo: 'texto' },
  { letra: 'L', indice: 11, titulo: 'Calcula e gera a folha via rotina automática?', tabela: 'cliente_folha', campo: 'folha_rotina_automatica', tipo: 'texto' },
  { letra: 'M', indice: 12, titulo: 'Código da Rotina Automática', tabela: 'cliente_folha', campo: 'codigo_rotina_automatica', tipo: 'texto' },
  { letra: 'N', indice: 13, titulo: 'MEIO', tabela: 'cliente_folha', campo: 'envio_meio', tipo: 'texto' },
  { letra: 'O', indice: 14, titulo: 'DOCUMENTO', tabela: 'cliente_folha', campo: 'envio_documento', tipo: 'texto' },
  { letra: 'P', indice: 15, titulo: 'CONTATO', tabela: 'cliente_folha', campo: 'envio_contato', tipo: 'texto' },
  { letra: 'Q', indice: 16, titulo: 'POSSUI LAUDO DE SST?', tabela: 'cliente_folha', campo: 'possui_laudos_sst', tipo: 'texto' },
  { letra: 'R', indice: 17, titulo: 'EMPRESA RESPONSÁVEL (SST)', tabela: 'cliente_folha', campo: 'empresa_responsavel_sst', tipo: 'texto' },
  { letra: 'S', indice: 18, titulo: 'DATA DE VENCIMENTO (laudo SST)', tabela: 'cliente_folha', campo: 'data_vencimento_laudo', tipo: 'data' },
  { letra: 'T', indice: 19, titulo: 'ASSINOU TERMO DE RESPONSABILIDADE?', tabela: 'cliente_folha', campo: 'termo_ciencia_sst', tipo: 'texto' },
  { letra: 'U', indice: 20, titulo: 'PRAZO DE VENCIMENTO PROCURAÇÃO RFB', tabela: 'cliente_folha', campo: 'venc_procuracao_rfb', tipo: 'data' },
  { letra: 'V', indice: 21, titulo: 'PRAZO DE VENCIMENTO PROCURAÇÃO DET E FGTS DIGITAL', tabela: 'cliente_folha', campo: 'venc_procuracao_det_fgts', tipo: 'data' },
  { letra: 'W', indice: 22, titulo: 'PRAZO DE VENCIMENTO PROCURAÇÃO E-CONSIGNADO', tabela: 'cliente_folha', campo: 'venc_procuracao_econsignado', tipo: 'data' },
  { letra: 'X', indice: 23, titulo: 'EMAILS QUE RECEBEM A NOTIFICAÇÃO DO DET', tabela: 'cliente_folha', campo: 'emails_notificacao_det', tipo: 'texto' },
  { letra: 'Y', indice: 24, titulo: 'RELATÓRIOS GERADOS NA ADMISSÃO', tabela: 'cliente_folha', campo: 'relatorios_admissao', tipo: 'texto' },
];

const COL_CODIGO = 0;
const COL_NOME = 1;
const LINHA_TITULOS = 1; // índice 0 (linha 2 do Excel)
const PRIMEIRA_LINHA_DADOS = 2;

/** Confere que cada coluna mapeada ainda tem o título esperado. */
function validarCabecalho(linhas: Celula[][], colunas: Coluna[]): void {
  const titulos = linhas[LINHA_TITULOS] ?? [];
  const normaliza = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const erros: string[] = [];

  for (const c of colunas) {
    const achado = texto(titulos[c.indice]) ?? '';
    // Compara o começo do título — alguns vêm com sufixos entre parênteses.
    const esperado = normaliza(c.titulo).slice(0, 14);
    if (!normaliza(achado).startsWith(esperado)) {
      erros.push(`  ${c.letra}: esperado "${c.titulo}", encontrado "${achado}"`);
    }
  }
  if (erros.length) {
    throw new Error(
      'O cabeçalho não bate com o mapeamento em atualiza-clientes.ts:\n' + erros.join('\n'),
    );
  }
}

// ------------------------------------------------------------------ relatório

interface EstatColuna {
  coluna: Coluna;
  iguais: number;
  alterados: number;
  preservadosPorVazio: number;
  limposPorTexto: Map<string, number>;
  exemplos: Array<{ codigo: number; nome: string; de: string | null; para: string | null }>;
}

const mostra = (v: string | null) => (v === null ? '(vazio)' : v.length > 40 ? v.slice(0, 40) + '…' : v);

// --------------------------------------------------------------------- main

async function run() {
  const caminhoArg = argValor('--file');
  if (!caminhoArg) throw new Error('Informe a planilha: --file "<caminho do .xlsx>"');
  const caminho = resolve(caminhoArg);
  if (!existsSync(caminho)) throw new Error(`Arquivo não encontrado: ${caminho}`);

  const dryRun = temFlag('--dry-run');
  const limparEmBranco = temFlag('--limpar-em-branco');

  // Seleção de colunas
  const somente = argValor('--colunas')?.split(',').map((s) => s.trim().toUpperCase());
  const exceto = argValor('--exceto')?.split(',').map((s) => s.trim().toUpperCase());
  let colunas = COLUNAS;
  if (somente) colunas = colunas.filter((c) => somente.includes(c.letra));
  if (exceto) colunas = colunas.filter((c) => !exceto.includes(c.letra));
  if (!colunas.length) throw new Error('Nenhuma coluna selecionada.');

  const wb = XLSX.readFile(caminho, { cellDates: false });
  const nomeAba = argValor('--aba') ?? (wb.SheetNames.includes('Planilha1') ? 'Planilha1' : wb.SheetNames[0]);
  const ws = wb.Sheets[nomeAba];
  if (!ws) throw new Error(`Aba "${nomeAba}" não encontrada. Disponíveis: ${wb.SheetNames.join(', ')}`);

  const linhas = XLSX.utils.sheet_to_json<Celula[]>(ws, { header: 1, blankrows: false, defval: null });
  validarCabecalho(linhas, colunas);

  console.log(`Planilha : ${caminho}`);
  console.log(`Aba      : ${nomeAba}`);
  console.log(`Colunas  : ${colunas.map((c) => c.letra).join(', ')} (${colunas.length} de ${COLUNAS.length})`);
  console.log(`Vazio    : ${limparEmBranco ? 'APAGA o valor no banco' : 'preserva o valor no banco'}\n`);

  // Dedup por código — vale a última linha, como no importador.
  const porCodigo = new Map<number, Celula[]>();
  const semCodigo: string[] = [];
  for (const celulas of linhas.slice(PRIMEIRA_LINHA_DADOS)) {
    const nome = texto(celulas[COL_NOME]);
    if (!nome) continue;
    const bruto = texto(celulas[COL_CODIGO]);
    const codigo = bruto === null ? NaN : Number(bruto);
    if (!Number.isInteger(codigo)) {
      semCodigo.push(`${nome} (código ${bruto ?? 'em branco'})`);
      continue;
    }
    porCodigo.set(codigo, celulas);
  }

  const atuais = await db
    .selectFrom('clientes')
    .leftJoin('cliente_folha', 'cliente_folha.cliente_id', 'clientes.id')
    .select([
      'clientes.id',
      'clientes.codigo',
      'clientes.nome',
      'clientes.data_evento_situacao',
      ...COLUNAS.filter((c) => c.tabela === 'cliente_folha').map(
        (c) => `cliente_folha.${c.campo}` as never,
      ),
    ])
    .execute();

  const porCodigoBanco = new Map(atuais.map((r) => [r.codigo as number, r as Record<string, unknown>]));

  const stats = new Map<string, EstatColuna>(
    colunas.map((c) => [
      c.letra,
      { coluna: c, iguais: 0, alterados: 0, preservadosPorVazio: 0, limposPorTexto: new Map(), exemplos: [] },
    ]),
  );

  const naoEncontrados: number[] = [];
  // cliente_id -> { tabela -> { campo: valor } }
  const updates = new Map<string, { clientes: Record<string, unknown>; folha: Record<string, unknown>; codigo: number }>();

  for (const [codigo, celulas] of porCodigo) {
    const atual = porCodigoBanco.get(codigo);
    if (!atual) {
      naoEncontrados.push(codigo);
      continue;
    }

    const alvo = { clientes: {} as Record<string, unknown>, folha: {} as Record<string, unknown>, codigo };

    for (const col of colunas) {
      const st = stats.get(col.letra)!;
      const bruto = celulas[col.indice];
      const vazio = bruto === null || bruto === undefined || String(bruto).trim() === '';

      let novo: string | null;
      if (col.tipo === 'data') {
        const d = data(bruto);
        novo = d.valor;
        if (d.textoIgnorado) {
          st.limposPorTexto.set(d.textoIgnorado, (st.limposPorTexto.get(d.textoIgnorado) ?? 0) + 1);
        }
      } else {
        novo = texto(bruto);
      }

      // Célula vazia: por padrão não mexe no que já está gravado.
      if (vazio && !limparEmBranco) {
        st.preservadosPorVazio++;
        continue;
      }

      const antigoBruto = atual[col.campo];
      const antigo =
        antigoBruto === null || antigoBruto === undefined
          ? null
          : antigoBruto instanceof Date
            ? antigoBruto.toISOString().slice(0, 10)
            : String(antigoBruto);

      if (antigo === novo) {
        st.iguais++;
        continue;
      }

      st.alterados++;
      if (st.exemplos.length < 3) {
        st.exemplos.push({ codigo, nome: String(atual.nome), de: antigo, para: novo });
      }
      if (col.tabela === 'clientes') alvo.clientes[col.campo] = novo;
      else alvo.folha[col.campo] = novo;
    }

    if (Object.keys(alvo.clientes).length || Object.keys(alvo.folha).length) {
      updates.set(String(atual.id), alvo);
    }
  }

  // ------------------------------------------------------------- relatório
  const barra = '='.repeat(74);
  console.log(barra);
  console.log(dryRun ? 'SIMULAÇÃO (--dry-run) — nada foi gravado' : 'ATUALIZAÇÃO');
  console.log(barra);
  console.log(`Linhas com código válido    : ${porCodigo.size}`);
  console.log(`Clientes que mudariam       : ${updates.size}`);
  if (semCodigo.length) {
    console.log(`\n⚠ ${semCodigo.length} linha(s) sem código válido — ignoradas:`);
    semCodigo.forEach((s) => console.log(`    ${s}`));
  }
  if (naoEncontrados.length) {
    console.log(`\n⚠ ${naoEncontrados.length} código(s) da planilha não existem no banco: ${naoEncontrados.join(', ')}`);
  }

  console.log('\nPor coluna:');
  console.log(`  ${'col'.padEnd(3)} ${'campo'.padEnd(32)} ${'muda'.padStart(5)} ${'igual'.padStart(6)} ${'vazio'.padStart(6)}`);
  for (const c of colunas) {
    const st = stats.get(c.letra)!;
    console.log(
      `  ${c.letra.padEnd(3)} ${c.campo.padEnd(32)} ${String(st.alterados).padStart(5)} ${String(st.iguais).padStart(6)} ${String(st.preservadosPorVazio).padStart(6)}`,
    );
  }

  const comExemplos = colunas.map((c) => stats.get(c.letra)!).filter((s) => s.alterados > 0);
  if (comExemplos.length) {
    console.log('\nExemplos do que mudaria:');
    for (const st of comExemplos) {
      console.log(`  [${st.coluna.letra}] ${st.coluna.campo}`);
      for (const e of st.exemplos) {
        console.log(`      ${e.codigo} ${e.nome.slice(0, 28).padEnd(28)} ${mostra(e.de)}  ->  ${mostra(e.para)}`);
      }
    }
  }

  const comTexto = colunas.map((c) => stats.get(c.letra)!).filter((s) => s.limposPorTexto.size);
  if (comTexto.length) {
    console.log('\n⚠ Texto em coluna de data — vira vazio (a coluna é `date` no banco):');
    for (const st of comTexto) {
      const total = [...st.limposPorTexto.values()].reduce((a, b) => a + b, 0);
      console.log(`  [${st.coluna.letra}] ${st.coluna.campo} — ${total} célula(s):`);
      for (const [v, n] of [...st.limposPorTexto.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`      ${String(n).padStart(4)}x  ${v.slice(0, 60)}`);
      }
    }
  }
  console.log(barra);

  if (dryRun) return;

  // --------------------------------------------------------------- backup
  // Só os clientes e campos que serão tocados — é o que basta para desfazer.
  const caminhoBackup = argValor('--backup');
  if (caminhoBackup) {
    const dump = [...updates.entries()].map(([clienteId, alvo]) => {
      const atual = atuais.find((a) => String(a.id) === clienteId) as Record<string, unknown>;
      const antes: Record<string, unknown> = {};
      for (const campo of [...Object.keys(alvo.clientes), ...Object.keys(alvo.folha)]) {
        const v = atual[campo];
        antes[campo] = v instanceof Date ? v.toISOString().slice(0, 10) : (v ?? null);
      }
      return { cliente_id: clienteId, codigo: alvo.codigo, nome: atual.nome, antes };
    });
    const destino = resolve(caminhoBackup);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, JSON.stringify({ planilha: caminho, registros: dump }, null, 2), 'utf8');
    console.log(`\nBackup do estado anterior: ${destino} (${dump.length} registro(s))`);
  } else {
    console.log('\n⚠ Sem --backup: esta alteração não poderá ser desfeita automaticamente.');
  }

  // ------------------------------------------------------------- gravação
  console.log(`\nGravando ${updates.size} cliente(s)...`);
  let n = 0;
  for (const [clienteId, alvo] of updates) {
    await db.transaction().execute(async (trx) => {
      if (Object.keys(alvo.clientes).length) {
        await trx
          .updateTable('clientes')
          // `version` sobe junto: quem estiver com a ficha aberta recebe 409
          // em vez de sobrescrever esta atualização sem perceber.
          .set({ ...alvo.clientes, version: sql`version + 1` } as never)
          .where('id', '=', clienteId)
          .execute();
      }
      if (Object.keys(alvo.folha).length) {
        await trx
          .updateTable('cliente_folha')
          .set({ ...alvo.folha, version: sql`version + 1` } as never)
          .where('cliente_id', '=', clienteId)
          .execute();
      }
    });
    n++;
    if (n % 100 === 0) console.log(`  ${n}/${updates.size}`);
  }
  console.log(`\nPronto — ${n} cliente(s) atualizado(s).`);
}

run()
  .catch((err) => {
    console.error('\n✖ ' + (err instanceof Error ? err.message : String(err)));
    process.exitCode = 1;
  })
  .finally(() => closeDb());
