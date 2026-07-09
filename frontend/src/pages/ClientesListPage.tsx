import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
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
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFiltros, listClientes } from '../api/resources';
import { EmptyState, Mono, SituacaoChip } from '../components/ui';

export function ClientesListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [situacao, setSituacao] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [regime, setRegime] = useState('');

  const { data: filtros } = useQuery({ queryKey: ['filtros'], queryFn: fetchFiltros });

  const { data: clientes, isFetching } = useQuery({
    queryKey: ['clientes', { q, situacao, responsavel, regime }],
    queryFn: () =>
      listClientes({
        q: q || undefined,
        situacao: situacao || undefined,
        responsavel: responsavel || undefined,
        regime: regime || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5">Informações Gerais</Typography>
          <Typography variant="body2" color="text.secondary">
            {clientes ? `${clientes.length} cliente(s)` : 'Carregando...'}
          </Typography>
        </Box>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            placeholder="Buscar por nome, CNPJ ou código"
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
          <TextField select label="Situação" value={situacao} onChange={(e) => setSituacao(e.target.value)} size="small" sx={{ minWidth: 150 }}>
            <MenuItem value="">Todas</MenuItem>
            {filtros?.situacoes.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Responsável" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} size="small" sx={{ minWidth: 150 }}>
            <MenuItem value="">Todos</MenuItem>
            {filtros?.responsaveis.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Regime" value={regime} onChange={(e) => setRegime(e.target.value)} size="small" sx={{ minWidth: 150 }}>
            <MenuItem value="">Todos</MenuItem>
            {filtros?.regimes.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        {isFetching && !clientes ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : clientes && clientes.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>CNPJ</TableCell>
                <TableCell>Situação</TableCell>
                <TableCell>Responsável</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clientes.map((c) => (
                <TableRow
                  key={c.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/clientes/${c.id}`)}
                >
                  <TableCell>
                    <Mono sx={{ fontWeight: 600, color: 'text.secondary' }}>{c.codigo}</Mono>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{c.nome}</TableCell>
                  <TableCell>{c.cnpj ? <Mono>{c.cnpj}</Mono> : '—'}</TableCell>
                  <TableCell>
                    <SituacaoChip situacao={c.situacao} />
                  </TableCell>
                  <TableCell>{c.responsavel ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState message="Nenhum cliente encontrado com esses critérios." />
        )}
      </Paper>
    </Box>
  );
}
