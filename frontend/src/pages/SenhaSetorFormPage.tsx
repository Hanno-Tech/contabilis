import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage, isConflict } from '../api/client';
import { createSenhaSetor, fetchSenhaSetor, updateSenhaSetor } from '../api/resources';
import { SectionCard } from '../components/ui';

const strOrNull = (s: string) => (s.trim() === '' ? null : s);

interface FormState {
  nome: string;
  link: string;
  usuario: string;
  senha: string;
  observacoes: string;
}

const emptyForm: FormState = { nome: '', link: '', usuario: '', senha: '', observacoes: '' };

export function SenhaSetorFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState<FormState>(emptyForm);
  const [version, setVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: senha, isLoading } = useQuery({
    queryKey: ['senha-setor', id],
    queryFn: () => fetchSenhaSetor(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!senha) return;
    setForm({
      nome: senha.nome ?? '',
      link: senha.link ?? '',
      usuario: senha.usuario ?? '',
      senha: '',
      observacoes: senha.observacoes ?? '',
    });
    setVersion(senha.version);
  }, [senha]);

  const setField = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConflict(false);
    if (!form.nome.trim()) {
      setError('Informe o nome do sistema/serviço.');
      return;
    }

    const payload: Record<string, unknown> = {
      nome: form.nome.trim(),
      link: strOrNull(form.link),
      usuario: strOrNull(form.usuario),
      observacoes: strOrNull(form.observacoes),
      // Só envia a senha quando preenchida (em branco na edição mantém a atual).
      ...(form.senha ? { senha: form.senha } : {}),
    };

    setSaving(true);
    try {
      if (isEdit) await updateSenhaSetor(id, { ...payload, version });
      else await createSenhaSetor(payload);
      queryClient.invalidateQueries({ queryKey: ['senhas-setor'] });
      navigate('/senhas-setor');
    } catch (err) {
      if (isConflict(err)) setConflict(true);
      else setError(apiErrorMessage(err, 'Não foi possível salvar a senha.'));
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
      <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/senhas-setor" sx={{ mb: 2 }}>
        Voltar
      </Button>
      <Typography variant="h5" sx={{ mb: 3 }}>
        {isEdit ? 'Editar senha do setor' : 'Nova senha do setor'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {conflict && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Esta senha foi alterada por outro usuário. Recarregue antes de salvar novamente.
        </Alert>
      )}

      <SectionCard title="Senha do setor">
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          A senha é armazenada cifrada. {isEdit && 'Deixe em branco para manter a atual.'}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Nome / sistema" value={form.nome} onChange={(e) => setField('nome', e.target.value)} required fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Link de acesso" value={form.link} onChange={(e) => setField('link', e.target.value)} fullWidth size="small" placeholder="https://..." />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Usuário" value={form.usuario} onChange={(e) => setField('usuario', e.target.value)} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Senha" type="password" value={form.senha} onChange={(e) => setField('senha', e.target.value)} fullWidth size="small" placeholder="••••••" />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Observações" value={form.observacoes} onChange={(e) => setField('observacoes', e.target.value)} fullWidth size="small" multiline minRows={3} />
          </Grid>
        </Grid>
      </SectionCard>

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button component={RouterLink} to="/senhas-setor">
          Cancelar
        </Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </Stack>
    </Box>
  );
}
