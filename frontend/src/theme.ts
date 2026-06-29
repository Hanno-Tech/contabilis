import { createTheme, alpha } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';

/**
 * Identidade Contabilis (contabilis.net) — contábil quente e moderno.
 * Laranja (ação) + marrom (estrutura/marca) sobre canvas areia,
 * com tipografia Space Grotesk (títulos), Inter (corpo) e JetBrains Mono (dados).
 */

const ink = '#FF8A1E'; // laranja — ação / marca
const inkStrong = '#EF8E19';
const brown = '#52473D'; // marrom — estrutura / texto
const brownDark = '#3B332C';
const canvas = '#F5F6FB'; // off-white neutro
const slate900 = '#1F1A16'; // tinta quase preta (leve toque marrom)
const slate500 = '#6B7280'; // cinza neutro (texto secundário)
const slate200 = '#E2E8F0'; // divisória neutra

const display = '"Space Grotesk", "Inter", system-ui, sans-serif';
const body = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const mono = '"JetBrains Mono", "SFMono-Regular", Menlo, monospace';

/** Gradiente assinatura — usado em marca, login e avatares. */
export const brandGradient = `linear-gradient(135deg, ${ink} 0%, ${inkStrong} 100%)`;

export const theme = createTheme(
  {
    palette: {
      primary: { main: ink, dark: inkStrong, light: '#FFA94D' },
      secondary: { main: brown, dark: brownDark, light: '#7A6E62' },
      success: { main: '#0E9F6E' },
      warning: { main: '#D97706' },
      error: { main: '#E11D48' },
      info: { main: '#0EA5E9' },
      background: { default: canvas, paper: '#FFFFFF' },
      text: { primary: slate900, secondary: slate500 },
      divider: slate200,
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: body,
      h4: { fontFamily: display, fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontFamily: display, fontWeight: 700, letterSpacing: '-0.015em' },
      h6: { fontFamily: display, fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 700 },
      button: { fontWeight: 600, letterSpacing: '0.01em' },
      overline: { letterSpacing: '0.12em', fontWeight: 700 },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 10, textTransform: 'none', paddingInline: 16 },
          containedPrimary: {
            background: brandGradient,
            boxShadow: `0 6px 16px ${alpha(ink, 0.28)}`,
            '&:hover': { background: brandGradient, filter: 'brightness(1.06)' },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: slate200 },
          elevation1: { boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.05)' },
          elevation3: { boxShadow: '0 12px 40px rgba(15,23,42,0.12)' },
        },
      },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: { root: { borderColor: slate200 } },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 8 },
          outlined: { borderWidth: 1.5 },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: '#FAFAFE',
              color: slate500,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              borderBottom: `1px solid ${slate200}`,
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': { backgroundColor: alpha(ink, 0.035) },
            transition: 'background-color 120ms ease',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: { root: { borderColor: '#EEF1F6' } },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: '#fff',
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 1.5 },
          },
        },
      },
      MuiAppBar: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiTooltip: {
        styleOverrides: { tooltip: { backgroundColor: slate900, fontSize: 12, borderRadius: 8 } },
      },
    },
  },
  ptBR,
);
