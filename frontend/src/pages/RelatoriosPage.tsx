import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchRelatorio, listRelatorios } from '../api/resources';
import { EmptyState } from '../components/ui';
import { exportRelatorioExcel } from '../lib/exportExcel';

export function RelatoriosPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const { data: catalogo } = useQuery({ queryKey: ['relatorios'], queryFn: listRelatorios });

  const { data: relatorio, isFetching } = useQuery({
    queryKey: ['relatorio', selected],
    queryFn: () => fetchRelatorio(selected!),
    enabled: !!selected,
  });

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
              onClick={() => setSelected(r.key)}
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
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {relatorio.titulo}
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                ({relatorio.linhas.length} registro(s))
              </Typography>
            </Typography>
            <Button
              variant="contained"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={() => exportRelatorioExcel(relatorio)}
              disabled={relatorio.linhas.length === 0}
            >
              Exportar Excel
            </Button>
          </Stack>
          <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
            {relatorio.linhas.length > 0 ? (
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
                  {relatorio.linhas.map((linha, i) => (
                    <TableRow key={i} hover>
                      {relatorio.colunas.map((c) => (
                        <TableCell key={c.key}>{linha[c.key] === '' || linha[c.key] == null ? '—' : linha[c.key]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState message="Nenhum registro para este relatório." />
            )}
          </Paper>
        </Box>
      ) : null}
    </Box>
  );
}
