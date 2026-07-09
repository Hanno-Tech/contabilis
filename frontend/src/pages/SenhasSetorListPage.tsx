import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
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
import { deleteSenhaSetor, listSenhasSetor, revelarSenhaSetor } from '../api/resources';
import { apiErrorMessage } from '../api/client';
import { EmptyState } from '../components/ui';

export function SenhasSetorListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [revelado, setRevelado] = useState<Record<string, string | null>>({});
  const [revelando, setRevelando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const { data: senhas, isFetching } = useQuery({
    queryKey: ['senhas-setor', { q }],
    queryFn: () => listSenhasSetor(q || undefined),
    placeholderData: keepPreviousData,
  });

  async function revelar(id: string) {
    setRevelando(id);
    setErro(null);
    try {
      const { senha } = await revelarSenhaSetor(id);
      setRevelado((r) => ({ ...r, [id]: senha }));
    } catch (e) {
      setErro(apiErrorMessage(e, 'Não foi possível revelar a senha.'));
    } finally {
      setRevelando(null);
    }
  }

  async function excluir(id: string, nome: string) {
    if (!window.confirm(`Excluir a senha "${nome}"? Esta ação não pode ser desfeita.`)) return;
    setErro(null);
    try {
      await deleteSenhaSetor(id);
      queryClient.invalidateQueries({ queryKey: ['senhas-setor'] });
    } catch (e) {
      setErro(apiErrorMessage(e, 'Não foi possível excluir a senha.'));
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <VpnKeyOutlinedIcon color="primary" />
            <Typography variant="h5">Senhas do setor</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {senhas ? `${senhas.length} senha(s)` : 'Carregando...'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/senhas-setor/nova')}>
          Nova senha
        </Button>
      </Stack>

      {erro && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderColor: 'error.main', color: 'error.main' }}>
          <Typography variant="body2">{erro}</Typography>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <TextField
          placeholder="Buscar por nome, usuário ou observações"
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
      </Paper>

      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        {isFetching && !senhas ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : senhas && senhas.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome / sistema</TableCell>
                <TableCell>Link</TableCell>
                <TableCell>Usuário</TableCell>
                <TableCell>Senha</TableCell>
                <TableCell>Observações</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {senhas.map((s) => {
                const senhaRevelada = revelado[s.id];
                const foiRevelada = Object.prototype.hasOwnProperty.call(revelado, s.id);
                return (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{s.nome}</TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      {s.link ? (
                        <Link href={s.link} target="_blank" rel="noopener" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, wordBreak: 'break-all' }}>
                          {s.link}
                          <OpenInNewIcon sx={{ fontSize: 13 }} />
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{s.usuario ?? '—'}</TableCell>
                    <TableCell>
                      {!s.tem_senha ? (
                        <Typography variant="body2" color="text.disabled">—</Typography>
                      ) : foiRevelada ? (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {senhaRevelada ?? '—'}
                          </Typography>
                          {senhaRevelada && (
                            <Tooltip title="Copiar">
                              <IconButton size="small" onClick={() => navigator.clipboard.writeText(senhaRevelada)}>
                                <ContentCopyIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      ) : (
                        <Button
                          size="small"
                          color="warning"
                          startIcon={revelando === s.id ? <CircularProgress size={14} /> : <VisibilityIcon />}
                          onClick={() => revelar(s.id)}
                          disabled={revelando === s.id}
                        >
                          Revelar
                        </Button>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 260, whiteSpace: 'pre-wrap' }}>{s.observacoes ?? '—'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => navigate(`/senhas-setor/${s.id}/editar`)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton size="small" color="error" onClick={() => excluir(s.id, s.nome)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <EmptyState message="Nenhuma senha cadastrada." />
        )}
      </Paper>
    </Box>
  );
}
