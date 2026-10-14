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
import { fetchFiltros, fetchFiltrosContabil, listClientesContabil } from '../api/resources';
import { EmptyState, Mono, SituacaoChip } from '../components/ui';

/** Informações gerais do setor contábil — carteira de clientes com a ficha contábil. */
export function ContabilClientesListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [situacao, setSituacao] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [prioridade, setPrioridade] = useState('');
  const [grupo, setGrupo] = useState('');
  const [regime, setRegime] = useState('');

  // Situação e regime vêm do cadastro geral; o resto, da ficha contábil.
  const { data: filtrosGerais } = useQuery({ queryKey: ['filtros'], queryFn: fetchFiltros });
  const { data: filtros } = useQuery({ queryKey: ['filtros-contabil'], queryFn: fetchFiltrosContabil });

  const { data: clientes, isFetching } = useQuery({
    queryKey: ['clientes-contabil', { q, situacao, responsavel, prioridade, grupo, regime }],
    queryFn: () =>
      listClientesContabil({
        q: q || undefined,
        situacao: situacao || undefined,
        responsavel: responsavel || undefined,
        prioridade: prioridade || undefined,
        grupo: grupo || undefined,
        regime: regime || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const filtro = (
    label: string,
    value: string,
    set: (v: string) => void,
    opcoes: string[] | undefined,
    todos = 'Todos',
  ) => (
    <TextField select label={label} value={value} onChange={(e) => set(e.target.value)} size="small" sx={{ minWidth: 150 }}>
      <MenuItem value="">{todos}</MenuItem>
      {opcoes?.map((o) => (
        <MenuItem key={o} value={o}>
          {o}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Informações Gerais</Typography>
        <Typography variant="body2" color="text.secondary">
          {clientes ? `${clientes.length} cliente(s)` : 'Carregando...'}
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
          <TextField
            placeholder="Buscar por nome, CNPJ, código ou grupo"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 240 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {filtro('Responsável', responsavel, setResponsavel, filtros?.responsaveis)}
          {filtro('Prioridade', prioridade, setPrioridade, filtros?.prioridades, 'Todas')}
          {filtro('Grupo', grupo, setGrupo, filtros?.grupos)}
          {filtro('Regime', regime, setRegime, filtrosGerais?.regimes)}
          {filtro('Situação', situacao, setSituacao, filtrosGerais?.situacoes, 'Todas')}
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
                <TableCell>Grupo empresarial</TableCell>
                <TableCell>Regime</TableCell>
                <TableCell>Responsável</TableCell>
                <TableCell>Prioridade</TableCell>
                <TableCell>Situação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clientes.map((c) => (
                <TableRow
                  key={c.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/contabil/clientes/${c.id}`)}
                >
                  <TableCell>
                    <Mono sx={{ fontWeight: 600, color: 'text.secondary' }}>{c.codigo}</Mono>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{c.nome}</TableCell>
                  <TableCell>{c.grupo_empresarial ?? '—'}</TableCell>
                  <TableCell>{c.regime_tributacao ?? '—'}</TableCell>
                  <TableCell>{c.responsavel ?? '—'}</TableCell>
                  <TableCell>{c.prioridade ?? '—'}</TableCell>
                  <TableCell>
                    <SituacaoChip situacao={c.situacao} />
                  </TableCell>
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
