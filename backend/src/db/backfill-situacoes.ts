/**
 * Preenche as colunas de *situação* de laudo e procurações a partir do texto
 * original das planilhas.
 *
 * Na carga inicial, colunas de data que traziam texto ("Sem Procuração",
 * "Desobrigada", "Não possui Laudos") viraram vazio — não havia onde guardar.
 * Agora há: cada data tem uma coluna de situação ao lado. Este script recupera
 * aquele texto e o grava, sem tocar em nenhuma data.
 *
 * Uso:
 *   npm run backfill:situacoes -- --file "../planilha.xlsx" [--dry-run]
 *
 * É idempotente e conservador: só grava onde a situação está vazia. Quem já
 * tem situação (inclusive o 'Data informada' posto pela migration) fica como está.
 */
import 'dotenv/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import XLSX from 'xlsx';
import { closeDb, db } from './index.js';

type Celula = string | number | boolean | Date | null | undefined;

function argValor(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const temFlag = (flag: string) => process.argv.includes(flag);

const texto = (v: Celula): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s === '' ? null : s;
};

/** Texto da planilha -> situação da procuração. `null` = não dá para afirmar nada. */
function situacaoProcuracao(bruto: string | null): string | null {
  if (!bruto) return null;
  const s = bruto.toLowerCase();
  if (s.startsWith('sem procuração') || s.startsWith('sem procuracao')) return 'Sem procuração';
  if (s === 'não possui' || s === 'nao possui') return 'Sem procuração';
  if (s.startsWith('não se aplica') || s.startsWith('nao se aplica')) return 'Não se aplica';
  // "EXPIRADA" e "-" não dizem se existe procuração; ficam para a equipe decidir.
  return null;
}

/** Texto da planilha -> situação do vencimento do laudo. */
function situacaoLaudo(bruto: string | null): string | null {
  if (!bruto) return null;
  const s = bruto.toLowerCase();
  if (s.startsWith('desobrigada')) return 'Desobrigada';
  if (s.startsWith('não possui laudo') || s.startsWith('nao possui laudo')) return 'Não possui Laudo';
  // "Deixar o campo aberto para o preenchimento da data" é instrução, não dado.
  return null;
}

/**
 * Onde procurar cada informação, por planilha. A coluna é localizada pelo
 * título, não pela posição, para o script sobreviver a mudanças de layout.
 */
const ALVOS = [
  { titulo: /procuraç(ã|a)o rfb/i, coluna: 'venc_procuracao_rfb_situacao', mapear: situacaoProcuracao },
  { titulo: /det e fgts|det\/fgts/i, coluna: 'venc_procuracao_det_fgts_situacao', mapear: situacaoProcuracao },
  { titulo: /e-?consignado/i, coluna: 'venc_procuracao_econsignado_situacao', mapear: situacaoProcuracao },
  { titulo: /^data de vencimento$/i, coluna: 'data_vencimento_laudo_situacao', mapear: situacaoLaudo },
] as const;

/** Acha a linha de cabeçalho e o índice das colunas de interesse. */
function localizar(linhas: Celula[][]) {
  let melhor = { linha: -1, achados: new Map<string, number>() };

  for (let i = 0; i < Math.min(12, linhas.length); i++) {
    const achados = new Map<string, number>();
    (linhas[i] ?? []).forEach((celula, j) => {
      const t = texto(celula);
      if (!t) return;
      for (const alvo of ALVOS) {
        if (alvo.titulo.test(t) && !achados.has(alvo.coluna)) achados.set(alvo.coluna, j);
      }
    });
    if (achados.size > melhor.achados.size) melhor = { linha: i, achados };
  }
  return melhor;
}

/** Índice da coluna de código da empresa, na linha de cabeçalho encontrada. */
function acharCodigo(linhas: Celula[][], linhaCab: number): number {
  const linha = linhas[linhaCab] ?? [];
  for (let j = 0; j < linha.length; j++) {
    if (/c(ó|o)digo da empresa/i.test(texto(linha[j]) ?? '')) return j;
  }
  return 0;
}

async function run() {
  const caminhoArg = argValor('--file');
  if (!caminhoArg) throw new Error('Informe a planilha: --file "<caminho do .xlsx>"');
  const caminho = resolve(caminhoArg);
  if (!existsSync(caminho)) throw new Error(`Arquivo não encontrado: ${caminho}`);
  const dryRun = temFlag('--dry-run');

  const wb = XLSX.readFile(caminho, { cellDates: false });
  const nomeAba =
    argValor('--aba') ??
    wb.SheetNames.find((n) => /vis(ã|a)o geral|planilha1/i.test(n)) ??
    wb.SheetNames[0];
  const linhas = XLSX.utils.sheet_to_json<Celula[]>(wb.Sheets[nomeAba], {
    header: 1,
    blankrows: false,
    defval: null,
  });

  const { linha: linhaCab, achados } = localizar(linhas);
  if (achados.size === 0) {
    throw new Error('Nenhuma coluna de procuração ou laudo reconhecida nesta planilha.');
  }
  const colCodigo = acharCodigo(linhas, linhaCab);

  console.log(`Planilha : ${caminho}`);
  console.log(`Aba      : ${nomeAba}  (cabeçalho na linha ${linhaCab + 1})`);
  console.log(
    'Colunas  : ' +
      [...achados].map(([c, j]) => `${c} <- ${XLSX.utils.encode_col(j)}`).join(', ') +
      '\n',
  );

  // Estado atual: só mexe em quem está com a situação vazia.
  const atuais = await db
    .selectFrom('clientes')
    .leftJoin('cliente_folha', 'cliente_folha.cliente_id', 'clientes.id')
    .select([
      'clientes.id',
      'clientes.codigo',
      'cliente_folha.venc_procuracao_rfb_situacao',
      'cliente_folha.venc_procuracao_det_fgts_situacao',
      'cliente_folha.venc_procuracao_econsignado_situacao',
      'cliente_folha.data_vencimento_laudo_situacao',
    ])
    .execute();
  const porCodigo = new Map(atuais.map((a) => [a.codigo, a as unknown as Record<string, unknown>]));

  const updates = new Map<string, Record<string, string>>();
  const stats = new Map<string, Map<string, number>>();
  let semReconhecer = 0;

  for (const celulas of linhas.slice(linhaCab + 1)) {
    const codigo = Number(texto(celulas[colCodigo]) ?? NaN);
    if (!Number.isInteger(codigo)) continue;
    const atual = porCodigo.get(codigo);
    if (!atual) continue;

    for (const alvo of ALVOS) {
      const j = achados.get(alvo.coluna);
      if (j === undefined) continue;
      if (atual[alvo.coluna]) continue; // já tem situação — não sobrescreve

      const bruto = texto(celulas[j]);
      if (typeof celulas[j] === 'number') continue; // é data, a migration já cuidou
      const situacao = alvo.mapear(bruto);
      if (!situacao) {
        if (bruto) semReconhecer++;
        continue;
      }

      const id = String(atual.id);
      updates.set(id, { ...(updates.get(id) ?? {}), [alvo.coluna]: situacao });
      const porColuna = stats.get(alvo.coluna) ?? new Map<string, number>();
      porColuna.set(situacao, (porColuna.get(situacao) ?? 0) + 1);
      stats.set(alvo.coluna, porColuna);
    }
  }

  const barra = '='.repeat(66);
  console.log(barra);
  console.log(dryRun ? 'SIMULAÇÃO — nada gravado' : 'BACKFILL DE SITUAÇÕES');
  console.log(barra);
  console.log(`clientes afetados: ${updates.size}`);
  for (const [coluna, valores] of stats) {
    const total = [...valores.values()].reduce((a, b) => a + b, 0);
    console.log(`  ${coluna} — ${total}`);
    for (const [v, n] of [...valores].sort((a, b) => b[1] - a[1])) {
      console.log(`      ${String(n).padStart(4)}x  ${v}`);
    }
  }
  if (semReconhecer) {
    console.log(`\n${semReconhecer} célula(s) com texto não conclusivo (ex.: "EXPIRADA", "-") — deixadas em branco.`);
  }
  console.log(barra);

  if (dryRun) return;

  let n = 0;
  for (const [clienteId, campos] of updates) {
    await db.updateTable('cliente_folha').set(campos).where('cliente_id', '=', clienteId).execute();
    n++;
  }
  console.log(`\nPronto — ${n} ficha(s) atualizada(s).`);
}

run()
  .catch((err) => {
    console.error('\n✖ ' + (err instanceof Error ? err.message : String(err)));
    process.exitCode = 1;
  })
  .finally(() => closeDb());
