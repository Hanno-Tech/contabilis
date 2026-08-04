import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage, isConflict } from '../api/client';
import { createEntidade, fetchEntidade, updateEntidade } from '../api/resources';
import { SectionCard, formatDocumento, isValidDocumento } from '../components/ui';
import { TIPOS_ENTIDADE } from '../lib/listas';

const strOrNull = (s: string) => (s.trim() === '' ? null : s.trim());

interface FormState {
  tipo: string;
  codigo: string;
  nome: string;
  cnpj: string;
  contato: string;
  ativo: boolean;
}

const emptyForm: FormState = {
  tipo: TIPOS_ENTIDADE[0],
  codigo: '',
  nome: '',
  cnpj: '',
  contato: '',
  ativo: true,
};

export function EntidadeFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState<FormState>(emptyForm);
  const [version, setVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: entidade, isLoading } = useQuery({
    queryKey: ['entidade', id],
    queryFn: () => fetchEntidade(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!entidade) return;
    setForm({
      tipo: entidade.tipo,
      codigo: entidade.codigo ?? '',
      nome: entidade.nome ?? '',
      cnpj: entidade.cnpj ?? '',
      contato: entidade.contato ?? '',
      ativo: entidade.ativo,
    });
    setVersion(entidade.version);
  }, [entidade]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConflict(false);

    if (!form.nome.trim()) {
      setError('Informe o nome.');
      return;
    }
    if (form.cnpj.trim() && !isValidDocumento(form.cnpj)) {
      setError('CNPJ/CPF inválido. Use CNPJ (00.000.000/0000-00) ou CPF (000.000.000-00).');
      return;
    }

    const payload: Record<string, unknown> = {
      tipo: form.tipo,
      codigo: strOrNull(form.codigo),
      nome: form.nome.trim(),
      cnpj: strOrNull(form.cnpj),
      contato: strOrNull(form.contato),
      ativo: form.ativo,
    };

    setSaving(true);
    try {
      if (isEdit) await updateEntidade(id, { ...payload, version });
      else await createEntidade(payload);
      queryClient.invalidateQueries({ queryKey: ['entidades'] });
      navigate('/entidades');
    } catch (err) {
      if (isConflict(err)) setConflict(true);
      else setError(apiErrorMessage(err, 'Não foi possível salvar o registro.'));
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
      <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/entidades" sx={{ mb: 2 }}>
        Voltar
      </Button>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {isEdit ? 'Editar cadastro' : 'Novo sindicato ou empresa de SST'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {conflict && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Este registro foi alterado por outro usuário. Recarregue antes de salvar novamente.
        </Alert>
      )}

      <SectionCard title="Dados do cadastro">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Tipo"
              value={form.tipo}
              onChange={(e) => setField('tipo', e.target.value)}
              fullWidth
              size="small"
              required
            >
              {TIPOS_ENTIDADE.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Código"
              value={form.codigo}
              onChange={(e) => setField('codigo', e.target.value)}
              fullWidth
              size="small"
              helperText="Opcional — o código usado internamente pelo setor"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Nome"
              value={form.nome}
              onChange={(e) => setField('nome', e.target.value)}
              required
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="CNPJ / CPF"
              value={form.cnpj}
              onChange={(e) => setField('cnpj', formatDocumento(e.target.value))}
              fullWidth
              size="small"
              placeholder="00.000.000/0000-00"
              inputProps={{ maxLength: 18 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Contato"
              value={form.contato}
              onChange={(e) => setField('contato', e.target.value)}
              fullWidth
              size="small"
              helperText="Telefone, e-mail ou pessoa de referência"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch checked={form.ativo} onChange={(e) => setField('ativo', e.target.checked)} />
              }
              label="Ativo"
            />
          </Grid>
        </Grid>
      </SectionCard>

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button component={RouterLink} to="/entidades">
          Cancelar
        </Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </Stack>
    </Box>
  );
}
