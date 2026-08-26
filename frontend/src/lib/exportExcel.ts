import * as XLSX from 'xlsx';
import type { Relatorio } from '../types';

/** Nome de arquivo em kebab-case a partir do título. */
function slug(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Linha de grupos + as mesclagens correspondentes, quando o relatório declara
 * `grupo` nas colunas (caso do fechamento da folha, que espelha a planilha do
 * setor). Sem grupos, devolve `null` e a planilha sai com um cabeçalho só.
 */
function linhaDeGrupos(rel: Relatorio): { linha: string[]; merges: XLSX.Range[] } | null {
  if (!rel.colunas.some((c) => c.grupo)) return null;
  const linha = rel.colunas.map((c) => c.grupo ?? '');
  const merges: XLSX.Range[] = [];
  let i = 0;
  while (i < rel.colunas.length) {
    const grupo = rel.colunas[i].grupo;
    let fim = i;
    while (grupo && fim + 1 < rel.colunas.length && rel.colunas[fim + 1].grupo === grupo) fim += 1;
    // Grupo em várias colunas: mescla na horizontal. Coluna solta: mescla com o
    // rótulo de baixo, como na planilha.
    if (fim > i) merges.push({ s: { r: 0, c: i }, e: { r: 0, c: fim } });
    else if (!grupo) merges.push({ s: { r: 0, c: i }, e: { r: 1, c: i } });
    i = fim + 1;
  }
  return { linha, merges };
}

/** Exporta um relatório (colunas + linhas) para um arquivo .xlsx real. */
export function exportRelatorioExcel(rel: Relatorio): void {
  const header = rel.colunas.map((c) => c.label);
  const grupos = linhaDeGrupos(rel);
  const linhas = rel.linhas.map((l) => rel.colunas.map((c) => l[c.key] ?? ''));
  const ws = XLSX.utils.aoa_to_sheet(
    grupos ? [grupos.linha, header, ...linhas] : [header, ...linhas],
  );
  if (grupos) {
    // Numa coluna sem grupo o rótulo fica na 1ª linha (a mescla cobre as duas).
    for (const m of grupos.merges) {
      if (m.e.r > m.s.r) ws[XLSX.utils.encode_cell(m.s)] = { t: 's', v: header[m.s.c] };
    }
    ws['!merges'] = grupos.merges;
  }

  // Largura das colunas ~ maior conteúdo (limitada para não estourar).
  ws['!cols'] = rel.colunas.map((c) => {
    const maxLen = rel.linhas.reduce(
      (m, l) => Math.max(m, String(l[c.key] ?? '').length),
      c.label.length,
    );
    return { wch: Math.min(60, Math.max(12, maxLen + 2)) };
  });

  const wb = XLSX.utils.book_new();
  // Nome da aba: máx. 31 caracteres, sem caracteres proibidos pelo Excel.
  const aba = rel.titulo.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Relatório';
  XLSX.utils.book_append_sheet(wb, ws, aba);
  XLSX.writeFile(wb, `${slug(rel.titulo)}.xlsx`);
}
