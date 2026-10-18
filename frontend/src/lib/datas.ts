/**
 * Datas no padrão brasileiro. O `<input type="date">` do navegador segue o
 * idioma do sistema (aparece mm/dd/aaaa em máquina em inglês), então os campos
 * de data do app são texto com máscara — veja `components/CampoData.tsx`. O
 * valor interno e o da API continuam ISO ('AAAA-MM-DD' / 'AAAA-MM').
 */

const dois = (n: number) => String(n).padStart(2, '0');

/** Hoje, no calendário local ('AAAA-MM-DD'). `toISOString` usaria UTC e viraria o dia à noite. */
export function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

/** Mês atual, no calendário local ('AAAA-MM'). */
export const mesAtualIso = () => hojeIso().slice(0, 7);

/** 'AAAA-MM-DD' -> 'DD/MM/AAAA' ('' se vazio ou inválido). */
export function isoParaBr(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** 'AAAA-MM' -> 'MM/AAAA' ('' se vazio ou inválido). */
export function mesIsoParaBr(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[2]}/${m[1]}` : '';
}

/** 'DD/MM/AAAA' -> 'AAAA-MM-DD'; '' se incompleta ou se o dia não existe (31/02). */
export function brParaIso(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return '';
  const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(a, mes - 1, d);
  const existe = data.getFullYear() === a && data.getMonth() === mes - 1 && data.getDate() === d;
  return existe && a >= 1900 ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

/** 'MM/AAAA' -> 'AAAA-MM'; '' se incompleta ou inválida. */
export function mesBrParaIso(br: string): string {
  const m = /^(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return '';
  const mes = Number(m[1]);
  return mes >= 1 && mes <= 12 && Number(m[2]) >= 1900 ? `${m[2]}-${m[1]}` : '';
}

/** Máscara enquanto digita: só dígitos, com as barras nas posições certas. */
export function mascaraData(texto: string, mes = false): string {
  const d = texto.replace(/\D/g, '').slice(0, mes ? 6 : 8);
  const corte = mes ? [2] : [2, 4];
  let out = '';
  for (let i = 0; i < d.length; i++) out += (corte.includes(i) ? '/' : '') + d[i];
  return out;
}
