import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { trocarSenha } from '../api/resources';

const MIN_SENHA = 10;

/**
 * Troca da própria senha. Necessário porque os usuários são criados por script
 * (`npm run seed:usuarios`) com senha gerada automaticamente — cada pessoa
 * define a sua no primeiro acesso.
 */
export function TrocarSenhaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  function fechar() {
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmacao('');
    setErro(null);
    setSucesso(false);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (novaSenha.length < MIN_SENHA) {
      setErro(`A nova senha precisa ter ao menos ${MIN_SENHA} caracteres.`);
      return;
    }
    if (novaSenha !== confirmacao) {
      setErro('A confirmação não confere com a nova senha.');
      return;
    }
    if (novaSenha === senhaAtual) {
      setErro('A nova senha precisa ser diferente da atual.');
      return;
    }

    setSalvando(true);
    try {
      await trocarSenha(senhaAtual, novaSenha);
      setSucesso(true);
      setTimeout(fechar, 1500);
    } catch (err) {
      setErro(apiErrorMessage(err, 'Não foi possível trocar a senha.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onClose={fechar} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Trocar senha</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {erro && <Alert severity="error">{erro}</Alert>}
            {sucesso && <Alert severity="success">Senha alterada.</Alert>}
            <TextField
              label="Senha atual"
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              autoComplete="current-password"
              fullWidth
              required
            />
            <TextField
              label="Nova senha"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              autoComplete="new-password"
              helperText={`Mínimo de ${MIN_SENHA} caracteres.`}
              fullWidth
              required
            />
            <TextField
              label="Confirmar nova senha"
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              autoComplete="new-password"
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={fechar} color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={salvando || sucesso}>
            {salvando ? 'Salvando...' : 'Trocar senha'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
