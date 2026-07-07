import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
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
  createEvento,
  deleteEvento,
  fetchEvento,
  fetchEventoOpcoes,
  listClientes,
  updateEvento,
} from '../api/resources';
import { ReadField, SectionCard } from '../components/ui';

const strOrNull = (s: string) => (s.trim() === '' ? null : s);
const mesAtual = () => new Date().toISOString().slice(0, 7);

interface FormState {
  cliente_id: string;
  competencia: string;
  colaborador_nome: string;
  descricao: string;
  situacao: string;
}

export function EventoFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState<FormState>({
    cliente_id: '',
    competencia: mesAtual(),
    colaborador_nome: '',
    descricao: '',
    situacao: 'A lançar',
  });
  const [version, setVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: opcoes } = useQuery({ queryKey: ['evento-opcoes'], queryFn: fetchEventoOpcoes });
  const { data: clientes } = useQuery({ queryKey: ['clientes', 'todos'], queryFn: () => listClientes({}) });
  const { data: evento, isLoading } = useQuery({
    queryKey: ['evento', id],
    queryFn: () => fetchEvento(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!evento) return;
    setForm({
      cliente_id: evento.cliente_id,
      competencia: evento.competencia?.slice(0, 7) ?? mesAtual(),
      colaborador_nome: evento.colaborador_nome ?? '',
      descricao: evento.descricao ?? '',
      situacao: evento.situacao ?? 'A lançar',
    });
    setVersion(evento.version);
  }, [evento]);

  const setField = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConflict(false);
    if (!form.cliente_id) {
      setError('Selecione o cliente do evento.');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(form.competencia)) {
      setError('Informe a competência de lançamento.');
      return;
    }

    const payload: Record<string, unknown> = {
      cliente_id: form.cliente_id,
      competencia: form.competencia,
      colaborador_nome: strOrNull(form.colaborador_nome),
      descricao: strOrNull(form.descricao),
      situacao: form.situacao,
    };

    setSaving(true);
    try {
      if (isEdit) await updateEvento(id, { ...payload, version });
      else await createEvento(payload);
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/eventos-futuros');
    } catch (err) {
      if (isConflict(err)) setConflict(true);
      else setError(apiErrorMessage(err, 'Não foi possível salvar o evento.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Excluir este evento? Esta ação não pode ser desfeita.')) return;
    setDeleting(true);
    try {
      await deleteEvento(id);
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      navigate('/eventos-futuros');
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível excluir o evento.'));
      setDeleting(false);
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
      <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/eventos-futuros" sx={{ mb: 2 }}>
        Voltar
      </Button>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {isEdit ? 'Editar evento futuro' : 'Novo evento futuro'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {conflict && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Este evento foi alterado por outro usuário. Recarregue antes de salvar novamente.
        </Alert>
      )}

      <SectionCard title="Evento futuro">
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
              label="Competência de lançamento"
              type="month"
              value={form.competencia}
              onChange={(e) => setField('competencia', e.target.value)}
              required
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Nome do colaborador"
              value={form.colaborador_nome}
              onChange={(e) => setField('colaborador_nome', e.target.value)}
              fullWidth
              size="small"
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
              {(opcoes?.situacoes ?? ['A lançar', 'Lançado', 'Cancelado']).map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Descrição do lançamento"
              value={form.descricao}
              onChange={(e) => setField('descricao', e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={2}
              helperText="Ex.: alteração de salário, mudança de função."
            />
          </Grid>
          {isEdit && evento && (
            <ReadField label="Lançado por" value={evento.usuario_nome ?? '—'} />
          )}
        </Grid>
      </SectionCard>

      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Box>
          {isEdit && (
            <Button color="error" startIcon={<DeleteIcon />} onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          )}
        </Box>
        <Stack direction="row" spacing={2}>
          <Button component={RouterLink} to="/eventos-futuros">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
