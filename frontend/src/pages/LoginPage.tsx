import { Alert, Box, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ContabilisLogo } from '../components/ContabilisLogo';
import { HannoLogo } from '../components/HannoLogo';

/**
 * Identidade visual da Contabilis (contabilis.net) — aplicada APENAS no login.
 * Marrom da marca + laranja de destaque, tipografia Exo 2 / Work Sans.
 */
const cBrown = '#52473D';
const cBrownDark = '#3B332C';
const cOrange = '#FF8A1E';
const cOrangeDark = '#EF8E19';
const cSand = '#FFFFFF';
const contabilisGradient = `linear-gradient(150deg, ${cBrown} 0%, ${cBrownDark} 100%)`;
const display = '"Work Sans", "Exo 2", sans-serif';
const body = '"Exo 2", sans-serif';

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('gisele');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate('/', { replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível entrar.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', fontFamily: body }}>
      {/* Painel de marca (desktop) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '46%',
          p: 6,
          color: '#fff',
          background: contabilisGradient,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* textura sutil de "razão" ao fundo */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.1,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '34px 34px',
          }}
        />
        {/* brilho laranja de destaque */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 360,
            height: 360,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${cOrange}55 0%, transparent 70%)`,
          }}
        />

        <Box sx={{ position: 'relative' }}>
          <ContabilisLogo style={{ height: 40, width: 'auto', color: '#fff' }} />
        </Box>

        <Box sx={{ position: 'relative' }}>
          <Typography
            sx={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: 42,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              mb: 2,
            }}
          >
            Menos burocracia.
            <br />
            <Box component="span" sx={{ color: cOrange }}>
              Mais resultados.
            </Box>
          </Typography>
          <Typography sx={{ opacity: 0.9, maxWidth: 420, fontSize: 16, fontFamily: body }}>
            Cadastro de clientes e convenções coletivas em um só lugar — com busca,
            histórico de alterações e credenciais protegidas.
          </Typography>
        </Box>

        <Typography variant="caption" sx={{ opacity: 0.75, position: 'relative', fontFamily: body }}>
          © {new Date().getFullYear()} Contabilis · Planejar. Ficar em dia. Crescer.
        </Typography>
      </Box>

      {/* Formulário */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: cSand,
          p: { xs: 3, sm: 6 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 380 }}>
          {/* marca compacta no mobile */}
          <Box sx={{ display: { md: 'none' }, mb: 4 }}>
            <ContabilisLogo style={{ height: 34, width: 'auto', color: cBrown }} />
          </Box>

          <Typography variant="h5" sx={{ mb: 0.5, fontFamily: display, fontWeight: 700, color: cBrown }}>
            Entrar
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, fontFamily: body, color: '#7A6E62' }}>
            Acesse o painel do Departamento Pessoal.
          </Typography>

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                fullWidth
                sx={inputSx}
              />
              <TextField
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                sx={inputSx}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  background: `linear-gradient(135deg, ${cOrange} 0%, ${cOrangeDark} 100%)`,
                  boxShadow: `0 6px 16px ${cOrange}55`,
                  fontFamily: display,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${cOrange} 0%, ${cOrangeDark} 100%)`,
                    filter: 'brightness(1.05)',
                  },
                }}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
              <Typography variant="caption" align="center" sx={{ fontFamily: body, color: '#7A6E62' }}>
                Acesso de demonstração: <strong>gisele</strong> / <strong>contabilis</strong>
              </Typography>
            </Stack>
          </form>
        </Box>

        {/* Rodapé — desenvolvido por Hanno Tech */}
        <Link
          href="https://hanno.com.br"
          target="_blank"
          rel="noopener noreferrer"
          underline="none"
          sx={{
            mt: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            color: '#9B8E80',
            transition: 'color 120ms ease',
            '&:hover': { color: cBrown },
          }}
        >
          <Typography sx={{ fontFamily: body, fontSize: 12 }}>desenvolvido por</Typography>
          <HannoLogo style={{ height: 13, width: 'auto' }} />
        </Link>
      </Box>
    </Box>
  );
}

const inputSx = {
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: cBrown,
  },
  '& label.Mui-focused': { color: cBrown },
} as const;
