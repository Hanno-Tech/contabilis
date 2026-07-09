import AddIcon from '@mui/icons-material/Add';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  MenuItem,
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
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchOcorrenciaOpcoes, listClientes, listOcorrencias } from '../api/resources';
import { EmptyState, Mono, formatDate } from '../components/ui';

/** Chip de situação da ocorrência: verde (resolvido), vermelho (não), âmbar (em análise). */
export function OcorrenciaStatusChip({ situacao }: { situacao: string }) {
  const lower = situacao.toLowerCase();
  const tone: 'success' | 'error' | 'warning' = lower.startsWith('resolv')
    ? 'success'
    : lower.includes('não') || lower.includes('nao')
      ? 'error'
      : 'warning';
  const palette = {
    success: { fg: '#0B7F58', bg: '#0E9F6E' },
    error: { fg: '#BE123C', bg: '#E11D48' },
    warning: { fg: '#B45309', bg: '#F59E0B' },
  }[tone];
  return (
    <Chip
      size="small"
      label={situacao}
      sx={{
        color: palette.fg,
        bgcolor: alpha(palette.bg, 0.14),
        fontWeight: 700,
        border: 'none',
        '& .MuiChip-label': { px: 1.25 },
      }}
    />
  );
}

/** Encurta textos longos na célula da tabela. */
function trunc(v: string | null, max = 90): string {
  if (!v) return '—';
  return v.length > max ? `${v.slice(0, max)}…` : v;
}

export function OcorrenciasListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [clienteId, setClienteId] = useState(searchParams.get('cliente') ?? '');
  const [situacao, setSituacao] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');

  const { data: opcoes } = useQuery({ queryKey: ['ocorrencia-opcoes'], queryFn: fetchOcorrenciaOpcoes });
  const { data: clientes } = useQuery({
    queryKey: ['clientes', 'todos'],
    queryFn: () => listClientes({}),
  });

  const { data: ocorrencias, isFetching } = useQuery({
    queryKey: ['ocorrencias', { q, clienteId, situacao, responsavelId, dataDe, dataAte }],
    queryFn: () =>
      listOcorrencias({
        q: q || undefined,
        cliente_id: clienteId || undefined,
        situacao: situacao || undefined,
        responsavel_id: responsavelId || undefined,
        data_de: dataDe || undefined,
        data_ate: dataAte || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <ReportProblemOutlinedIcon color="primary" />
            <Typography variant="h5">Ocorrências</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {ocorrencias ? `${ocorrencias.length} ocorrência(s)` : 'Carregando...'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/ocorrencias/nova')}>
          Nova ocorrência
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            placeholder="Buscar por ocorrência, resolução ou cliente"
            value={q}
            onChange={(e) => setQ(e.target.value)}
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
          <TextField select label="Cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)} size="small" sx={{ minWidth: 200 }}>
            <MenuItem value="">Todos</MenuItem>
            {clientes?.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.nome}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Situação" value={situacao} onChange={(e) => setSituacao(e.target.value)} size="small" sx={{ minWidth: 160 }}>
            <MenuItem value="">Todas</MenuItem>
            {opcoes?.situacoes.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Responsável" value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)} size="small" sx={{ minWidth: 160 }}>
            <MenuItem value="">Todos</MenuItem>
            {opcoes?.usuarios.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.nome}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Data de" type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} size="small" sx={{ minWidth: 150 }} InputLabelProps={{ shrink: true }} />
          <TextField label="Data até" type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} size="small" sx={{ minWidth: 150 }} InputLabelProps={{ shrink: true }} />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        {isFetching && !ocorrencias ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : ocorrencias && ocorrencias.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Ocorrência</TableCell>
                <TableCell>Situação</TableCell>
                <TableCell>Responsável</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ocorrencias.map((o) => (
                <TableRow
                  key={o.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/ocorrencias/${o.id}/editar`)}
                >
                  <TableCell>
                    <Mono>{formatDate(o.data)}</Mono>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{o.cliente_nome}</TableCell>
                  <TableCell sx={{ maxWidth: 380 }}>{trunc(o.ocorrencia)}</TableCell>
                  <TableCell>
                    <OcorrenciaStatusChip situacao={o.situacao} />
                  </TableCell>
                  <TableCell>{o.responsavel_nome ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState message="Nenhuma ocorrência encontrada com esses critérios." />
        )}
      </Paper>
    </Box>
  );
}
