import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiErrorMessage, isConflict } from '../api/client';
import { createImovel, deleteImovel, fetchImovel, listClientes, updateImovel } from '../api/resources';
import { campoEditavel } from '../components/CampoEditavel';
import { SectionCard } from '../components/ui';
import { CHAVES_IMOVEL, CHAVES_IMOVEL_NUMERICAS, QUADROS_IMOVEL } from '../lib/contabil-campos';

const vazio = () => ({ ...Object.fromEntries(CHAVES_IMOVEL.map((k) => [k, ''])), situacao: 'Ativo' });

export function ImovelFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = mode === 'edit';

  const [clienteId, setClienteId] = useState(searchParams.get('cliente') ?? '');
  const [numero, setNumero] = useState('');
  const [form, setForm] = useState<Record<string, string>>(vazio);
  const [version, setVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: clientes } = useQuery({ queryKey: ['clientes', 'todos'], queryFn: () => listClientes({}) });
  const { data: imovel, isLoading } = useQuery({
    queryKey: ['imovel', id],
    queryFn: () => fetchImovel(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!imovel) return;
    setClienteId(imovel.cliente_id);
    setNumero(String(imovel.numero_ordem));
    setForm(Object.fromEntries(CHAVES_IMOVEL.map((k) => [k, imovel[k] == null ? '' : String(imovel[k])])));
    setVersion(imovel.version);
  }, [imovel]);

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const voltar = () => navigate('/contabil/imoveis');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConflict(false);
    if (!clienteId) {
      setError('Selecione o cliente dono do imóvel.');
      return;
    }

    const payload: Record<string, unknown> = {
      cliente_id: clienteId,
      numero_ordem: numero.trim() ? Number(numero) : null,
    };
    for (const key of CHAVES_IMOVEL) {
      const raw = form[key]?.trim() ?? '';
      payload[key] = raw === '' ? null : CHAVES_IMOVEL_NUMERICAS.has(key) ? Number(raw) : raw;
    }
    payload.situacao = form.situacao || 'Ativo';

    setSaving(true);
    try {
      if (isEdit) await updateImovel(id, { ...payload, version });
      else await createImovel(payload);
      queryClient.invalidateQueries({ queryKey: ['imoveis'] });
      queryClient.invalidateQueries({ queryKey: ['imovel', id] });
      voltar();
    } catch (err) {
      if (isConflict(err)) setConflict(true);
      else setError(apiErrorMessage(err, 'Não foi possível salvar o imóvel.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Excluir este imóvel? Esta ação não pode ser desfeita.')) return;
    try {
      await deleteImovel(id);
      queryClient.invalidateQueries({ queryKey: ['imoveis'] });
      voltar();
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível excluir o imóvel.'));
    }
  }

  if (isEdit && isLoading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/contabil/imoveis" sx={{ mb: 2 }}>
        Voltar
      </Button>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5">{isEdit ? 'Editar imóvel' : 'Novo imóvel'}</Typography>
        {isEdit && (
          <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={handleDelete}>
            Excluir
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {conflict && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Este imóvel foi alterado por outro usuário. Recarregue antes de salvar novamente.
        </Alert>
      )}

      <SectionCard title="Cliente">
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField select label="Cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required fullWidth size="small">
              {(clientes ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.codigo} — {c.nome}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Número de ordem"
              type="number"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              fullWidth
              size="small"
              inputProps={{ min: 1, step: 1 }}
              helperText={isEdit ? undefined : 'Em branco: próximo número do cliente'}
            />
          </Grid>
        </Grid>
      </SectionCard>

      {QUADROS_IMOVEL.map((q) => (
        <SectionCard key={q.title} title={q.title}>
          {q.nota && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {q.nota}
            </Typography>
          )}
          <Grid container spacing={2}>
            {q.fields.map((f) => campoEditavel(f, form, setField, q.perguntas))}
          </Grid>
        </SectionCard>
      ))}

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button component={RouterLink} to="/contabil/imoveis">
          Cancelar
        </Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </Stack>
    </Box>
  );
}
