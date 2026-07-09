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
  createOcorrencia,
  fetchOcorrencia,
  fetchOcorrenciaOpcoes,
  listClientes,
  updateOcorrencia,
} from '../api/resources';
import { useAuth } from '../auth/AuthContext';
import { SectionCard } from '../components/ui';

const strOrNull = (s: string) => (s.trim() === '' ? null : s);
const today = () => new Date().toISOString().slice(0, 10);

interface FormState {
  cliente_id: string;
  data: string;
  ocorrencia: string;
  porque: string;
  resolucao: string;
  situacao: string;
  responsavel_id: string;
}

export function OcorrenciaFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState<FormState>({
    cliente_id: '',
    data: today(),
    ocorrencia: '',
    porque: '',
    resolucao: '',
    situacao: 'Em análise',
    responsavel_id: '',
  });
  const [version, setVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: opcoes } = useQuery({ queryKey: ['ocorrencia-opcoes'], queryFn: fetchOcorrenciaOpcoes });
  const { data: clientes } = useQuery({
    queryKey: ['clientes', 'todos'],
    queryFn: () => listClientes({}),
  });
  const { data: ocorrencia, isLoading } = useQuery({
    queryKey: ['ocorrencia', id],
    queryFn: () => fetchOcorrencia(id),
    enabled: isEdit,
  });

  // Ao criar, pré-seleciona o usuário logado como responsável.
  useEffect(() => {
    if (isEdit || !user) return;
    setForm((f) => (f.responsavel_id ? f : { ...f, responsavel_id: user.id }));
  }, [isEdit, user]);

  useEffect(() => {
    if (!ocorrencia) return;
    setForm({
      cliente_id: ocorrencia.cliente_id,
      data: ocorrencia.data ?? today(),
      ocorrencia: ocorrencia.ocorrencia ?? '',
      porque: ocorrencia.porque ?? '',
      resolucao: ocorrencia.resolucao ?? '',
      situacao: ocorrencia.situacao ?? 'Em análise',
      responsavel_id: ocorrencia.responsavel_id ?? '',
    });
    setVersion(ocorrencia.version);
  }, [ocorrencia]);

  const setField = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConflict(false);
    if (!form.cliente_id) {
      setError('Selecione o cliente vinculado à ocorrência.');
      return;
    }
    if (!form.data) {
      setError('Informe a data da ocorrência.');
      return;
    }
    if (!form.ocorrencia.trim()) {
      setError('Descreva o que aconteceu.');
      return;
    }

    const responsavel = opcoes?.usuarios.find((u) => u.id === form.responsavel_id);
    const payload: Record<string, unknown> = {
      cliente_id: form.cliente_id,
      data: form.data,
      ocorrencia: form.ocorrencia.trim(),
      porque: strOrNull(form.porque),
      resolucao: strOrNull(form.resolucao),
      situacao: form.situacao,
      responsavel_id: responsavel?.id ?? null,
      responsavel_nome: responsavel?.nome ?? null,
    };

    setSaving(true);
    try {
      if (isEdit) await updateOcorrencia(id, { ...payload, version });
      else await createOcorrencia(payload);
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] });
      navigate('/ocorrencias');
    } catch (err) {
      if (isConflict(err)) setConflict(true);
      else setError(apiErrorMessage(err, 'Não foi possível salvar a ocorrência.'));
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
      <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/ocorrencias" sx={{ mb: 2 }}>
        Voltar
      </Button>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {isEdit ? 'Editar ocorrência' : 'Nova ocorrência'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {conflict && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Esta ocorrência foi alterada por outro usuário. Recarregue antes de salvar novamente.
        </Alert>
      )}

      <SectionCard title="Ocorrência">
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
          <Grid item xs={12} md={4}>
            <TextField
              label="Data"
              type="date"
              value={form.data}
              onChange={(e) => setField('data', e.target.value)}
              required
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="O que aconteceu"
              value={form.ocorrencia}
              onChange={(e) => setField('ocorrencia', e.target.value)}
              required
              fullWidth
              size="small"
              multiline
              minRows={3}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Por que aconteceu"
              value={form.porque}
              onChange={(e) => setField('porque', e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={3}
              helperText="A causa ou motivo da ocorrência."
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Medida adotada"
              value={form.resolucao}
              onChange={(e) => setField('resolucao', e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={3}
              helperText="O que foi feito para resolver ou tratar a ocorrência."
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
              {(opcoes?.situacoes ?? ['Resolvido', 'Não resolvido', 'Em análise']).map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              label="Responsável"
              value={form.responsavel_id}
              onChange={(e) => setField('responsavel_id', e.target.value)}
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
        <Button component={RouterLink} to="/ocorrencias">
          Cancelar
        </Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </Stack>
    </Box>
  );
}
