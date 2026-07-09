import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage, isConflict } from '../api/client';
import {
  createPendencia,
  fetchPendencia,
  fetchPendenciaOpcoes,
  listClientes,
  updatePendencia,
} from '../api/resources';
import { ReadField, SectionCard, formatDate } from '../components/ui';

interface FormState {
  cliente_id: string;
  descricao: string;
  situacao: string;
  usuario_solucao_id: string;
}

export function PendenciaFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState<FormState>({
    cliente_id: '',
    descricao: '',
    situacao: 'Aberta',
    usuario_solucao_id: '',
  });
  const [version, setVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: opcoes } = useQuery({ queryKey: ['pendencia-opcoes'], queryFn: fetchPendenciaOpcoes });
  const { data: clientes } = useQuery({ queryKey: ['clientes', 'todos'], queryFn: () => listClientes({}) });
  const { data: pendencia, isLoading } = useQuery({
    queryKey: ['pendencia', id],
    queryFn: () => fetchPendencia(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!pendencia) return;
    setForm({
      cliente_id: pendencia.cliente_id,
      descricao: pendencia.descricao ?? '',
      situacao: pendencia.situacao ?? 'Aberta',
      usuario_solucao_id: pendencia.usuario_solucao_id ?? '',
    });
    setVersion(pendencia.version);
  }, [pendencia]);

  const setField = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConflict(false);
    if (!form.cliente_id) {
      setError('Selecione o cliente da pendência.');
      return;
    }
    if (!form.descricao.trim()) {
      setError('Descreva a pendência.');
      return;
    }

    const solucao = opcoes?.usuarios.find((u) => u.id === form.usuario_solucao_id);
    const payload: Record<string, unknown> = {
      cliente_id: form.cliente_id,
      descricao: form.descricao.trim(),
      situacao: form.situacao,
      usuario_solucao_id: solucao?.id ?? null,
      usuario_solucao_nome: solucao?.nome ?? null,
    };

    setSaving(true);
    try {
      if (isEdit) await updatePendencia(id, { ...payload, version });
      else await createPendencia(payload);
      queryClient.invalidateQueries({ queryKey: ['pendencias'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/pendencias');
    } catch (err) {
      if (isConflict(err)) setConflict(true);
      else setError(apiErrorMessage(err, 'Não foi possível salvar a pendência.'));
    } finally {
      setSaving(false);
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
      <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/pendencias" sx={{ mb: 2 }}>
        Voltar
      </Button>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {isEdit ? 'Editar pendência' : 'Nova pendência'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {conflict && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Esta pendência foi alterada por outro usuário. Recarregue antes de salvar novamente.
        </Alert>
      )}

      <SectionCard title="Pendência">
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              select
              label="Cliente"
              value={form.cliente_id}
              onChange={(e) => setField('cliente_id', e.target.value)}
              required
              fullWidth
              size="small"
            >
              {clientes?.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.nome}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          {isEdit && pendencia && (
            <>
              <ReadField label="Data do cadastro" value={formatDate(pendencia.data)} />
              <ReadField label="Cadastrada por" value={pendencia.usuario_cadastro_nome ?? '—'} />
            </>
          )}
          <Grid item xs={12}>
            <TextField
              label="Descrição da pendência"
              value={form.descricao}
              onChange={(e) => setField('descricao', e.target.value)}
              required
              fullWidth
              size="small"
              multiline
              minRows={3}
              helperText={
                isEdit ? undefined : 'A data será gravada automaticamente com o dia de hoje.'
              }
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              label="Situação"
              value={form.situacao}
              onChange={(e) => setField('situacao', e.target.value)}
              fullWidth
              size="small"
            >
              {(opcoes?.situacoes ?? ['Aberta', 'Desconsiderada', 'Resolvida']).map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              label="Usuário que vai solucionar"
              value={form.usuario_solucao_id}
              onChange={(e) => setField('usuario_solucao_id', e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="">Ninguém</MenuItem>
              {opcoes?.usuarios.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.nome}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </SectionCard>

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button component={RouterLink} to="/pendencias">
          Cancelar
        </Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </Stack>
    </Box>
  );
}
