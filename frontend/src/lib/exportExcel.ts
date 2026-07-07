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

/** Exporta um relatório (colunas + linhas) para um arquivo .xlsx real. */
export function exportRelatorioExcel(rel: Relatorio): void {
  const header = rel.colunas.map((c) => c.label);
  const linhas = rel.linhas.map((l) => rel.colunas.map((c) => l[c.key] ?? ''));
  const ws = XLSX.utils.aoa_to_sheet([header, ...linhas]);

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
