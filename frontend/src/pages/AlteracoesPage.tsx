import DescriptionIcon from '@mui/icons-material/Description';
import GroupsIcon from '@mui/icons-material/Groups';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAlteracoes } from '../api/resources';
import { EmptyState, Mono } from '../components/ui';
import type { Alteracao, FieldChange } from '../types';

/** Formata um ISO timestamp em 'DD/MM/AAAA às HH:MM'. */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

/** Encurta valores muito longos para a célula "de → para". */
function trunc(v: string | null, max = 80): string {
  if (v === null || v === '') return '—';
  return v.length > max ? `${v.slice(0, max)}…` : v;
}

function ChangeRow({ change }: { change: FieldChange }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 0.75, py: 0.4 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 160 }}>
        {change.rotulo}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: 'error.main',
          textDecoration: 'line-through',
          textDecorationColor: 'rgba(0,0,0,0.25)',
        }}
      >
        {trunc(change.de)}
      </Typography>
      <Box component="span" sx={{ color: 'text.disabled' }}>
        →
      </Box>
      <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
        {trunc(change.para)}
      </Typography>
    </Box>
  );
}

function AlteracaoCard({ item }: { item: Alteracao }) {
  const navigate = useNavigate();
  const isCliente = item.entidade === 'cliente';
  const destino = isCliente ? `/clientes/${item.entidade_id}` : `/cct/${item.entidade_id}`;
  const entidadeLabel = isCliente ? 'Cliente' : 'Convenção';

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1.5 }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main', fontSize: 15 }}>
          {item.usuario_nome?.charAt(0).toUpperCase() ?? '?'}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mb: 0.5 }}
          >
            <Typography variant="body2">
              <strong>{item.usuario_nome ?? 'Alguém'}</strong>{' '}
              {item.acao === 'criou' ? 'criou' : 'editou'} {isCliente ? 'o' : 'a'}{' '}
              {entidadeLabel.toLowerCase()}
            </Typography>
            <Chip
              size="small"
              icon={isCliente ? <GroupsIcon /> : <DescriptionIcon />}
              label={item.entidade_label ?? '—'}
              variant="outlined"
              onClick={() => navigate(destino)}
              sx={{ cursor: 'pointer', maxWidth: 320 }}
            />
            <Chip
              size="small"
              label={item.acao === 'criou' ? 'Criação' : 'Edição'}
              color={item.acao === 'criou' ? 'success' : 'primary'}
              variant="outlined"
            />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            <Mono>{formatDateTime(item.created_at)}</Mono>
          </Typography>

          {item.alteracoes.length > 0 && (
            <Box sx={{ mt: 1, pl: 1, borderLeft: 2, borderColor: 'divider' }}>
              {item.alteracoes.map((c) => (
                <ChangeRow key={c.campo} change={c} />
              ))}
            </Box>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

export function AlteracoesPage() {
  const [q, setQ] = useState('');
  const [entidade, setEntidade] = useState<'' | 'cliente' | 'convencao'>('');

  const { data, isFetching } = useQuery({
    queryKey: ['alteracoes', { q, entidade }],
    queryFn: () =>
      listAlteracoes({ q: q || undefined, entidade: entidade || undefined }),
    placeholderData: keepPreviousData,
  });

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <HistoryIcon color="primary" />
            <Typography variant="h5">Alterações</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {data ? `${data.length} registro(s) de auditoria` : 'Carregando...'}
          </Typography>
        </Box>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            placeholder="Buscar por registro ou usuário"
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
          <TextField
            select
            label="Tipo"
            value={entidade}
            onChange={(e) => setEntidade(e.target.value as typeof entidade)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="cliente">Clientes</MenuItem>
            <MenuItem value="convencao">Convenções</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      {isFetching && !data ? (
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      ) : data && data.length > 0 ? (
        <Box>
          {data.map((item) => (
            <AlteracaoCard key={item.id} item={item} />
          ))}
        </Box>
      ) : (
        <Paper variant="outlined">
          <EmptyState message="Nenhuma alteração registrada ainda." />
        </Paper>
      )}
    </Box>
  );
}
