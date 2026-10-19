import AddIcon from '@mui/icons-material/Add';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
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
import { listClientes, listImoveis } from '../api/resources';
import { EmptyState, Mono } from '../components/ui';
import {
  ETAPAS_INTEGRALIZACAO,
  FORMA_AQUISICAO_OPCOES,
  FORMA_INTEGRALIZACAO,
  SITUACAO_IMOVEL_OPCOES,
  TIPO_IMOVEL_OPCOES,
  progressoIntegralizacao,
} from '../lib/contabil-campos';
import type { Imovel } from '../types';

const PALETA = {
  success: { fg: '#0B7F58', bg: '#0E9F6E' },
  warning: { fg: '#B45309', bg: '#F59E0B' },
  neutral: { fg: '#475569', bg: '#64748B' },
};

function Pill({ label, tone }: { label: string; tone: keyof typeof PALETA }) {
  const p = PALETA[tone];
  return (
    <Chip
      size="small"
      label={label}
      sx={{ color: p.fg, bgcolor: alpha(p.bg, 0.14), fontWeight: 700, '& .MuiChip-label': { px: 1.25 } }}
    />
  );
}

/** "Ativo" em verde; as demais situações dizem que o imóvel saiu do patrimônio. */
export function ImovelSituacaoChip({ situacao }: { situacao: string }) {
  return <Pill label={situacao} tone={situacao === 'Ativo' ? 'success' : 'neutral'} />;
}

/**
 * Andamento da integralização. Aparece para imóveis recebidos por
 * integralização e para qualquer um que já tenha etapa marcada.
 */
function IntegralizacaoChip({ imovel }: { imovel: Imovel }) {
  const feitas = progressoIntegralizacao(imovel);
  if (imovel.forma_aquisicao !== FORMA_INTEGRALIZACAO && feitas === 0) return <>—</>;
  if (imovel.transferencia_finalizada === 'Sim') return <Pill label="Finalizada" tone="success" />;
  return <Pill label={`${feitas} de ${ETAPAS_INTEGRALIZACAO.length} etapas`} tone="warning" />;
}

export function ImoveisListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [clienteId, setClienteId] = useState(searchParams.get('cliente') ?? '');
  const [tipo, setTipo] = useState('');
  const [forma, setForma] = useState('');
  const [situacao, setSituacao] = useState('');

  const { data: clientes } = useQuery({ queryKey: ['clientes', 'todos'], queryFn: () => listClientes({}) });
  const { data: imoveis, isFetching } = useQuery({
    queryKey: ['imoveis', { q, clienteId, tipo, forma, situacao }],
    queryFn: () =>
      listImoveis({
        q: q || undefined,
        cliente_id: clienteId || undefined,
        tipo: tipo || undefined,
        forma_aquisicao: forma || undefined,
        situacao: situacao || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const filtro = (label: string, value: string, set: (v: string) => void, opcoes: string[], todos = 'Todos') => (
    <TextField select label={label} value={value} onChange={(e) => set(e.target.value)} size="small" sx={{ minWidth: 160 }}>
      <MenuItem value="">{todos}</MenuItem>
      {opcoes.map((o) => (
        <MenuItem key={o} value={o}>
          {o}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <HomeWorkOutlinedIcon color="primary" />
            <Typography variant="h5">Controle de imóveis</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {imoveis ? `${imoveis.length} imóvel(is)` : 'Carregando...'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate(`/contabil/imoveis/novo${clienteId ? `?cliente=${clienteId}` : ''}`)}
        >
          Novo imóvel
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
          <TextField
            placeholder="Buscar por cliente, matrícula, município, loteamento ou CIB"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 260 }}
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
          {filtro('Tipo', tipo, setTipo, TIPO_IMOVEL_OPCOES)}
          {filtro('Forma de aquisição', forma, setForma, FORMA_AQUISICAO_OPCOES, 'Todas')}
          {filtro('Situação', situacao, setSituacao, SITUACAO_IMOVEL_OPCOES, 'Todas')}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        {isFetching && !imoveis ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : imoveis && imoveis.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Nº</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Município</TableCell>
                <TableCell>Matrícula</TableCell>
                <TableCell>Utilização</TableCell>
                <TableCell>Integralização</TableCell>
                <TableCell>Situação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {imoveis.map((i) => (
                <TableRow key={i.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/contabil/imoveis/${i.id}/editar`)}>
                  <TableCell sx={{ fontWeight: 600 }}>{i.cliente_nome}</TableCell>
                  <TableCell>
                    <Mono>{i.numero_ordem}</Mono>
                  </TableCell>
                  <TableCell>{i.tipo ?? '—'}</TableCell>
                  <TableCell>{i.municipio ?? '—'}</TableCell>
                  <TableCell>{i.matricula ? <Mono>{i.matricula}</Mono> : '—'}</TableCell>
                  <TableCell>{i.utilizacao ?? '—'}</TableCell>
                  <TableCell>
                    <IntegralizacaoChip imovel={i} />
                  </TableCell>
                  <TableCell>
                    <ImovelSituacaoChip situacao={i.situacao} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState message="Nenhum imóvel encontrado com esses critérios." />
        )}
      </Paper>
    </Box>
  );
}
