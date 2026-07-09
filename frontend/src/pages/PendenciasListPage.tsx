import AddIcon from '@mui/icons-material/Add';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
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
import { useNavigate } from 'react-router-dom';
import { fetchPendenciaOpcoes, listClientes, listPendencias } from '../api/resources';
import { EmptyState, Mono, formatDate } from '../components/ui';

/** Chip de situação da pendência: âmbar (aberta), verde (resolvida), cinza (desconsiderada). */
export function PendenciaStatusChip({ situacao }: { situacao: string }) {
  const lower = situacao.toLowerCase();
  const tone: 'success' | 'neutral' | 'warning' = lower.startsWith('resolv')
    ? 'success'
    : lower.startsWith('descons')
      ? 'neutral'
      : 'warning';
  const palette = {
    success: { fg: '#0B7F58', bg: '#0E9F6E' },
    neutral: { fg: '#475569', bg: '#64748B' },
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

function trunc(v: string | null, max = 90): string {
  if (!v) return '—';
  return v.length > max ? `${v.slice(0, max)}…` : v;
}

export function PendenciasListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [situacao, setSituacao] = useState('');
  const [solucaoId, setSolucaoId] = useState('');
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');

  const { data: opcoes } = useQuery({ queryKey: ['pendencia-opcoes'], queryFn: fetchPendenciaOpcoes });
  const { data: clientes } = useQuery({ queryKey: ['clientes', 'todos'], queryFn: () => listClientes({}) });

  const { data: pendencias, isFetching } = useQuery({
    queryKey: ['pendencias', { q, clienteId, situacao, solucaoId, dataDe, dataAte }],
    queryFn: () =>
      listPendencias({
        q: q || undefined,
        cliente_id: clienteId || undefined,
        situacao: situacao || undefined,
        solucao_id: solucaoId || undefined,
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
            <PlaylistAddCheckIcon color="primary" />
            <Typography variant="h5">Pendências</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {pendencias ? `${pendencias.length} pendência(s)` : 'Carregando...'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/pendencias/nova')}>
          Nova pendência
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            placeholder="Buscar por descrição ou cliente"
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
          <TextField select label="Solucionar" value={solucaoId} onChange={(e) => setSolucaoId(e.target.value)} size="small" sx={{ minWidth: 160 }}>
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
        {isFetching && !pendencias ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : pendencias && pendencias.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Pendência</TableCell>
                <TableCell>Cadastrou</TableCell>
                <TableCell>Solucionar</TableCell>
                <TableCell>Situação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendencias.map((p) => (
                <TableRow
                  key={p.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/pendencias/${p.id}/editar`)}
                >
                  <TableCell>
                    <Mono>{formatDate(p.data)}</Mono>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{p.cliente_nome}</TableCell>
                  <TableCell sx={{ maxWidth: 360 }}>{trunc(p.descricao)}</TableCell>
                  <TableCell>{p.usuario_cadastro_nome ?? '—'}</TableCell>
                  <TableCell>{p.usuario_solucao_nome ?? '—'}</TableCell>
                  <TableCell>
                    <PendenciaStatusChip situacao={p.situacao} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState message="Nenhuma pendência encontrada com esses critérios." />
        )}
      </Paper>
    </Box>
  );
}
