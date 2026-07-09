import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { fetchRelatorio, listRelatorios } from '../api/resources';
import type { Relatorio } from '../types';
import { EmptyState } from '../components/ui';
import { exportRelatorioExcel } from '../lib/exportExcel';

/** 'DD/MM/AAAA' ou 'MM/AAAA' -> 'AAAA-MM-DD' comparável (ou null se não for data). */
function parseDataBr(value: unknown): string | null {
  const s = String(value ?? '').trim();
  let m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = /^(\d{2})\/(\d{4})$/.exec(s); // competência MM/AAAA -> 1º dia do mês
  if (m) return `${m[2]}-${m[1]}-01`;
  return null;
}

/** Colunas cujos valores parecem datas (para habilitar o filtro de período). */
function colunasDeData(rel: Relatorio): string[] {
  return rel.colunas
    .filter((c) => rel.linhas.some((l) => parseDataBr(l[c.key]) !== null))
    .map((c) => c.key);
}

/** Aplica busca por texto (qualquer coluna) e filtro de período (colunas de data). */
function filtrarLinhas(
  rel: Relatorio,
  busca: string,
  dataDe: string,
  dataAte: string,
  colsData: string[],
): Relatorio['linhas'] {
  const termo = busca.trim().toLowerCase();
  return rel.linhas.filter((linha) => {
    if (termo) {
      const casa = rel.colunas.some((c) =>
        String(linha[c.key] ?? '').toLowerCase().includes(termo),
      );
      if (!casa) return false;
    }
    if ((dataDe || dataAte) && colsData.length) {
      const noPeriodo = colsData.some((key) => {
        const iso = parseDataBr(linha[key]);
        if (!iso) return false;
        if (dataDe && iso < dataDe) return false;
        if (dataAte && iso > dataAte) return false;
        return true;
      });
      if (!noPeriodo) return false;
    }
    return true;
  });
}

export function RelatoriosPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');

  const { data: catalogo } = useQuery({ queryKey: ['relatorios'], queryFn: listRelatorios });

  const { data: relatorio, isFetching } = useQuery({
    queryKey: ['relatorio', selected],
    queryFn: () => fetchRelatorio(selected!),
    enabled: !!selected,
  });

  const colsData = useMemo(() => (relatorio ? colunasDeData(relatorio) : []), [relatorio]);
  const filtradas = useMemo(
    () => (relatorio ? filtrarLinhas(relatorio, busca, dataDe, dataAte, colsData) : []),
    [relatorio, busca, dataDe, dataAte, colsData],
  );

  // Ao trocar de relatório, limpa os critérios de busca.
  function escolher(key: string) {
    setSelected(key);
    setBusca('');
    setDataDe('');
    setDataAte('');
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <AssessmentOutlinedIcon color="primary" />
        <Typography variant="h5">Relatórios</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Selecione um relatório para visualizar e exportar para Excel.
      </Typography>

      {/* Catálogo de relatórios */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        {catalogo?.map((r) => {
          const active = r.key === selected;
          return (
            <Paper
              key={r.key}
              variant="outlined"
              onClick={() => escolher(r.key)}
              sx={{
                p: 1.75,
                width: 260,
                cursor: 'pointer',
                borderColor: active ? 'primary.main' : 'divider',
                bgcolor: (t) => (active ? alpha(t.palette.primary.main, 0.06) : '#fff'),
                transition: 'border-color 120ms ease, background-color 120ms ease',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700, color: active ? 'primary.main' : 'text.primary' }}>
                {r.titulo}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {r.descricao}
              </Typography>
            </Paper>
          );
        })}
      </Stack>

      {!selected ? (
        <Paper variant="outlined">
          <EmptyState message="Escolha um relatório acima." />
        </Paper>
      ) : isFetching && !relatorio ? (
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      ) : relatorio ? (
        <Box>
          {/* Critérios de busca do relatório selecionado */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                placeholder="Buscar em qualquer coluna"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              {colsData.length > 0 && (
                <>
                  <TextField label="Data de" type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} size="small" sx={{ minWidth: 150 }} InputLabelProps={{ shrink: true }} />
                  <TextField label="Data até" type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} size="small" sx={{ minWidth: 150 }} InputLabelProps={{ shrink: true }} />
                </>
              )}
            </Stack>
          </Paper>

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {relatorio.titulo}
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                ({filtradas.length} de {relatorio.linhas.length} registro(s))
              </Typography>
            </Typography>
            <Button
              variant="contained"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={() => exportRelatorioExcel({ ...relatorio, linhas: filtradas })}
              disabled={filtradas.length === 0}
            >
              Exportar Excel
            </Button>
          </Stack>
          <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
            {filtradas.length > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {relatorio.colunas.map((c) => (
                      <TableCell key={c.key} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {c.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtradas.map((linha, i) => (
                    <TableRow key={i} hover>
                      {relatorio.colunas.map((c) => (
                        <TableCell key={c.key}>{linha[c.key] === '' || linha[c.key] == null ? '—' : linha[c.key]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState message="Nenhum registro encontrado com esses critérios." />
            )}
          </Paper>
        </Box>
      ) : null}
    </Box>
  );
}
