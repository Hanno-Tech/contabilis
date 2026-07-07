import AddIcon from '@mui/icons-material/Add';
import EventNoteIcon from '@mui/icons-material/EventNote';
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
import { fetchEventoOpcoes, listClientes, listEventos } from '../api/resources';
import { EmptyState, Mono, formatCompetencia } from '../components/ui';

/** Chip de situação do evento: âmbar (a lançar), verde (lançado), cinza (cancelado). */
export function EventoStatusChip({ situacao }: { situacao: string }) {
  const lower = situacao.toLowerCase();
  const tone: 'success' | 'neutral' | 'warning' = lower.startsWith('lanç')
    ? 'success'
    : lower.startsWith('cancel')
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

export function EventosListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [situacao, setSituacao] = useState('');

  const { data: opcoes } = useQuery({ queryKey: ['evento-opcoes'], queryFn: fetchEventoOpcoes });
  const { data: clientes } = useQuery({ queryKey: ['clientes', 'todos'], queryFn: () => listClientes({}) });

  const { data: eventos, isFetching } = useQuery({
    queryKey: ['eventos', { q, clienteId, situacao }],
    queryFn: () =>
      listEventos({
        q: q || undefined,
        cliente_id: clienteId || undefined,
        situacao: situacao || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <EventNoteIcon color="primary" />
            <Typography variant="h5">Eventos futuros</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {eventos ? `${eventos.length} evento(s)` : 'Carregando...'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/eventos-futuros/novo')}>
          Novo evento
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            placeholder="Buscar por colaborador, descrição ou cliente"
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
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        {isFetching && !eventos ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : eventos && eventos.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Competência</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Colaborador</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Lançado por</TableCell>
                <TableCell>Situação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eventos.map((ev) => (
                <TableRow
                  key={ev.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/eventos-futuros/${ev.id}/editar`)}
                >
                  <TableCell>
                    <Mono>{formatCompetencia(ev.competencia)}</Mono>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{ev.cliente_nome}</TableCell>
                  <TableCell>{ev.colaborador_nome ?? '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>{ev.descricao ?? '—'}</TableCell>
                  <TableCell>{ev.usuario_nome ?? '—'}</TableCell>
                  <TableCell>
                    <EventoStatusChip situacao={ev.situacao} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState message="Nenhum evento futuro encontrado com esses critérios." />
        )}
      </Paper>
    </Box>
  );
}
