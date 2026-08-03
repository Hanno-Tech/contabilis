import { Box, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { mono } from '../theme';

/**
 * Tratamento "razão": identificadores e números (código, CNPJ, R$, datas)
 * em mono tabular — a assinatura visual da ferramenta contábil.
 */
export function Mono({
  children,
  sx,
}: {
  children: ReactNode;
  sx?: object;
}) {
  return (
    <Box
      component="span"
      sx={{ fontFamily: mono, fontFeatureSettings: '"tnum" 1', fontSize: '0.9em', ...sx }}
    >
      {children}
    </Box>
  );
}

/**
 * Card de bloco da ficha (preserva o agrupamento das planilhas — RNF-04).
 *
 * `fill` serve ao dashboard: o card ocupa toda a altura da linha do Grid, de
 * modo que os dois cards lado a lado terminam iguais, e o corpo rola por
 * dentro. Com `maxHeight` a linha para de crescer — sem isso, um card com
 * centenas de registros esticaria a página inteira.
 */
export function SectionCard({
  title,
  icon,
  children,
  action,
  fill,
  maxHeight,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  fill?: boolean;
  maxHeight?: number | string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        mb: 2.5,
        ...(fill && {
          // 100% da linha menos a própria margem inferior (mb: 2.5 = 20px).
          height: 'calc(100% - 20px)',
          maxHeight,
          display: 'flex',
          flexDirection: 'column',
        }),
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2, flexShrink: 0 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          {icon}
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Stack>
        {action}
      </Stack>
      {fill ? (
        <Box
          sx={{
            flex: 1,
            minHeight: 0, // deixa o flex encolher o suficiente para rolar
            overflowY: 'auto',
            // Espaço para a barra de rolagem não cobrir o conteúdo.
            pr: 0.5,
            mr: -0.5,
          }}
        >
          {children}
        </Box>
      ) : (
        children
      )}
    </Paper>
  );
}

/** Par rótulo/valor para leitura. `wide` ocupa a linha inteira (texto longo). */
export function ReadField({
  label,
  value,
  wide = false,
  pre = false,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
  pre?: boolean;
}) {
  const empty = value === null || value === undefined || value === '';
  return (
    <Grid item xs={12} sm={wide ? 12 : 6} md={wide ? 12 : 4}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ mt: 0.25, whiteSpace: pre ? 'pre-wrap' : 'normal', color: empty ? 'text.disabled' : 'text.primary' }}
      >
        {empty ? '—' : value}
      </Typography>
    </Grid>
  );
}

export function SituacaoChip({ situacao }: { situacao: string }) {
  const lower = situacao.toLowerCase();
  const tone: 'success' | 'neutral' | 'error' =
    lower.includes('ativ') || lower.includes('vigente')
      ? 'success'
      : lower.includes('expir') || lower.includes('inativ') || lower.includes('baix')
        ? 'error'
        : 'neutral';
  const palette = {
    success: { fg: '#0B7F58', bg: '#0E9F6E' },
    error: { fg: '#BE123C', bg: '#E11D48' },
    neutral: { fg: '#475569', bg: '#64748B' },
  }[tone];
  return (
    <Chip
      size="small"
      label={situacao}
      sx={{
        color: palette.fg,
        bgcolor: alpha(palette.bg, 0.12),
        fontWeight: 700,
        border: 'none',
        '& .MuiChip-label': { px: 1.25 },
      }}
    />
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
      <Typography variant="body2">{message}</Typography>
    </Box>
  );
}

/** Formata 'YYYY-MM-DD' para 'DD/MM/AAAA'. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

/** Formata 'YYYY-MM-DD' (ou 'YYYY-MM') para a competência 'MM/AAAA'. */
export function formatCompetencia(value: string | null | undefined): string {
  if (!value) return '—';
  const [y, m] = value.slice(0, 10).split('-');
  if (!y || !m) return value;
  return `${m}/${y}`;
}

// -------------------------------------------------------------- CNPJ / CPF

function maskCpf(clean: string): string {
  const c = clean.slice(0, 11);
  let out = c.slice(0, 3);
  if (c.length > 3) out += '.' + c.slice(3, 6);
  if (c.length > 6) out += '.' + c.slice(6, 9);
  if (c.length > 9) out += '-' + c.slice(9, 11);
  return out;
}

function maskCnpj(clean: string): string {
  const c = clean.slice(0, 14);
  let out = c.slice(0, 2);
  if (c.length > 2) out += '.' + c.slice(2, 5);
  if (c.length > 5) out += '.' + c.slice(5, 8);
  if (c.length > 8) out += '/' + c.slice(8, 12);
  if (c.length > 12) out += '-' + c.slice(12, 14);
  return out;
}

/**
 * Máscara de documento: CPF (000.000.000-00) ou CNPJ — numérico ou alfanumérico
 * (regra da Receita: 12 posições alfanuméricas + 2 dígitos verificadores).
 * Até 11 caracteres só-numéricos são tratados como CPF; caso contrário, CNPJ.
 */
export function formatDocumento(raw: string): string {
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const isCpf = clean.length <= 11 && /^\d*$/.test(clean);
  return isCpf ? maskCpf(clean) : maskCnpj(clean);
}

const CPF_RE = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const CNPJ_RE = /^[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}$/;

/** Valida CPF ou CNPJ (numérico/alfanumérico) já formatado. */
export function isValidDocumento(value: string): boolean {
  const v = value.trim().toUpperCase();
  return CPF_RE.test(v) || CNPJ_RE.test(v);
}

/** Formata número/string numérica em R$. */
export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
