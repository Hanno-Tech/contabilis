import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import GroupsIcon from '@mui/icons-material/Groups';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
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
  Tooltip,
  Typography,
} from '@mui/material';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { deleteEntidade, listEntidades } from '../api/resources';
import { EmptyState, Mono } from '../components/ui';
import { TIPOS_ENTIDADE } from '../lib/listas';

export function EntidadesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const { data: entidades, isFetching } = useQuery({
    queryKey: ['entidades', { q, tipo }],
    queryFn: () => listEntidades({ q: q || undefined, tipo: tipo || undefined }),
    placeholderData: keepPreviousData,
  });

  async function excluir(id: string, nome: string) {
    if (!window.confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
    setErro(null);
    try {
      await deleteEntidade(id);
      queryClient.invalidateQueries({ queryKey: ['entidades'] });
    } catch (e) {
      setErro(apiErrorMessage(e, 'Não foi possível excluir o registro.'));
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <GroupsIcon color="primary" />
            <Typography variant="h5">Sindicatos e empresas de SST</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {entidades ? `${entidades.length} registro(s)` : 'Carregando...'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/entidades/novo')}>
          Novo cadastro
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            size="small"
            placeholder="Buscar por nome, código, CNPJ ou contato"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="Tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">
              <em>Todos</em>
            </MenuItem>
            {TIPOS_ENTIDADE.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {erro && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'error.main' }}>
          <Typography variant="body2" color="error">
            {erro}
          </Typography>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        {isFetching && !entidades ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : entidades && entidades.length > 0 ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Código</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>CNPJ</TableCell>
                <TableCell>Contato</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entidades.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>
                    <Chip
                      size="small"
                      label={e.tipo}
                      variant="outlined"
                      color={e.tipo === 'Sindicato' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{e.codigo ? <Mono>{e.codigo}</Mono> : '—'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {e.nome}
                    {!e.ativo && (
                      <Chip size="small" label="Inativo" sx={{ ml: 1 }} color="warning" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>{e.cnpj ? <Mono>{e.cnpj}</Mono> : '—'}</TableCell>
                  <TableCell>{e.contato || '—'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => navigate(`/entidades/${e.id}/editar`)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton size="small" color="error" onClick={() => excluir(e.id, e.nome)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState message="Nenhum registro encontrado." />
        )}
      </Paper>
    </Box>
  );
}
