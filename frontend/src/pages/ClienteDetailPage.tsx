import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LockIcon from '@mui/icons-material/Lock';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { fetchEstruturaFicha, fetchFicha, revelarCredenciais } from '../api/resources';
import { ReadField, SectionCard, SituacaoChip, formatDate, formatMoney } from '../components/ui';
import { SCALAR_CARDS } from '../lib/ficha-campos';
import { quadroVisivel } from '../lib/listas';
import type { ClienteFolha, CredencialRevelada } from '../types';

const TIPO_LABEL: Record<string, string> = {
  seguro_desemprego: 'Seguro Desemprego',
  empregado_domestico: 'Empregado Doméstico',
};

const EMPTY_FOLHA = {} as Partial<ClienteFolha>;

export function ClienteDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data: cliente, isLoading, error } = useQuery({
    queryKey: ['ficha', id],
    queryFn: () => fetchFicha(id),
  });
  // Regra de quadros por tipo de cliente — mesma fonte que o formulário usa.
  const { data: estrutura } = useQuery({
    queryKey: ['estrutura-ficha'],
    queryFn: fetchEstruturaFicha,
    staleTime: Infinity,
  });

  // Revelação de senhas (uma vez, compartilhada pelos quadros SENHAS e Empregador Doméstico).
  const [revelado, setRevelado] = useState<CredencialRevelada[] | null>(null);
  const [revelando, setRevelando] = useState(false);
  const [revelarErro, setRevelarErro] = useState<string | null>(null);
  async function revelar() {
    setRevelando(true);
    setRevelarErro(null);
    try {
      setRevelado(await revelarCredenciais(id));
    } catch {
      setRevelarErro('Não foi possível revelar as senhas.');
    } finally {
      setRevelando(false);
    }
  }
  const revMap = new Map((revelado ?? []).map((r) => [r.id, r]));

  if (isLoading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error || !cliente) {
    return <Alert severity="error">Não foi possível carregar o cliente.</Alert>;
  }

  const folha = cliente.folha ?? EMPTY_FOLHA;
  const empregado = cliente.credenciais.find((c) => c.tipo === 'empregado_domestico');
  const orgaos = cliente.credenciais.filter((c) => c.tipo !== 'empregado_domestico');

  /** Cada tipo de cliente usa um subconjunto dos quadros — mesma regra do formulário. */
  const visivel = (titulo: string) =>
    quadroVisivel(titulo, cliente.tipo_cliente, estrutura?.quadrosPorTipo);

  /** Valores como texto, para avaliar os `showIf` do catálogo. */
  const comoTexto = Object.fromEntries(
    Object.entries(folha as Record<string, unknown>).map(([k, v]) => [k, v == null ? '' : String(v)]),
  );

  /**
   * Renderiza um quadro a partir do catálogo compartilhado com o formulário,
   * para as duas telas nunca mais divergirem sobre quais campos existem.
   */
  const quadroEscalar = (titulo: string, extras?: React.ReactNode) => {
    if (!visivel(titulo)) return null;
    const card = SCALAR_CARDS.find((c) => c.title === titulo);
    if (!card) return null;
    return (
      <SectionCard title={titulo}>
        <Grid container spacing={2}>
          {extras}
          {card.fields.map((f) => {
            if (f.showIf && !f.showIf(comoTexto)) return null;
            const bruto = (folha as Record<string, unknown>)[f.key] as string | null;
            const valor =
              f.type === 'date'
                ? formatDate(bruto)
                : f.key === 'inss_salario_contribuicao'
                  ? bruto && formatMoney(bruto)
                  : bruto;
            return (
              <ReadField
                key={f.key}
                label={f.label}
                value={valor}
                wide={f.wide}
                pre={f.type === 'multiline'}
              />
            );
          })}
        </Grid>
      </SectionCard>
    );
  };

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} component={RouterLink} to="/clientes" sx={{ mb: 2 }}>
        Voltar
      </Button>

      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h5">{cliente.nome}</Typography>
            <SituacaoChip situacao={cliente.situacao} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Código {cliente.codigo} · {cliente.cnpj ?? 'sem CNPJ'}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/clientes/${id}/editar`)}>
          Editar
        </Button>
      </Stack>

      {/* 1. Dados da empresa (geral — editado em Informações gerais) */}
      <SectionCard
        title="Dados da empresa"
        action={
          <Button
            size="small"
            component={RouterLink}
            to={`/informacoes-gerais/${id}/editar`}
            startIcon={<EditIcon fontSize="small" />}
          >
            Editar dados gerais
          </Button>
        }
      >
        <Grid container spacing={2}>
          <ReadField label="Código" value={cliente.codigo} />
          <ReadField label="Razão Social" value={cliente.nome} />
          <ReadField label="CNPJ / CPF" value={cliente.cnpj} />
          <ReadField label="Tipo" value={cliente.tipo_cliente} />
          <ReadField label="Situação" value={cliente.situacao} />
          <ReadField label="Data da situação" value={formatDate(cliente.data_evento_situacao)} />
          <ReadField label="Responsável" value={cliente.responsavel} />
        </Grid>
      </SectionCard>

      {/* Quadros escalares — renderizados do catálogo compartilhado com o formulário */}
      {quadroEscalar(
        'Informações tributárias',
        <ReadField key="regime" label="Regime de tributação" value={cliente.regime_tributacao} />,
      )}
      {quadroEscalar('Admissão')}
      {quadroEscalar('Fechamento da folha')}

      {/* Informações sindicais (lista própria) */}
      {visivel('Informações sindicais') && (
        <SectionCard title="Informações sindicais">
          {cliente.sindicatos.length === 0 ? (
            <Typography variant="body2" color="text.disabled">
              Nenhum sindicato cadastrado.
            </Typography>
          ) : (
            cliente.sindicatos.map((s, i) => (
              <Box key={s.id ?? i}>
                {i > 0 && <Divider sx={{ my: 2 }} />}
                <Grid container spacing={2}>
                  <ReadField label="Filiação sindical" value={s.sindicato} wide />
                  <ReadField label="Situação da convenção" value={s.situacao_convencao} />
                  <ReadField label="Recolhe contribuições sindicais?" value={s.recolhe_contribuicao} />
                </Grid>
              </Box>
            ))
          )}
        </SectionCard>
      )}

      {quadroEscalar('Informações sobre SST')}
      {quadroEscalar('Forma de envio dos documentos')}
      {quadroEscalar('Dados de contribuintes individuais')}

      {/* Empregador doméstico (credenciais) */}
      {visivel('Dados do empregador doméstico') && (
        <SectionCard
          title="Dados do empregador doméstico"
          icon={<LockIcon fontSize="small" color="warning" />}
          action={<RevelarButton revelado={!!revelado} revelando={revelando} onRevelar={revelar} disabled={!empregado} />}
        >
          {revelarErro && <Alert severity="error" sx={{ mb: 2 }}>{revelarErro}</Alert>}
          {!empregado ? (
            <Typography variant="body2" color="text.disabled">
              Sem dados cadastrados.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              <ReadField label="Usuário e-social" value={empregado.usuario} />
              <SecretField label="Senha" value={revMap.get(empregado.id)?.senha ?? null} masked={!revelado && empregado.tem_senha} />
            </Grid>
          )}
        </SectionCard>
      )}

      {quadroEscalar('Procurações')}

      {/* 12. Senhas (por órgão) */}
      <SectionCard
        title="Senhas"
        icon={<LockIcon fontSize="small" color="warning" />}
        action={<RevelarButton revelado={!!revelado} revelando={revelando} onRevelar={revelar} disabled={orgaos.length === 0} />}
      >
        {orgaos.length === 0 ? (
          <Typography variant="body2" color="text.disabled">
            Nenhum órgão cadastrado.
          </Typography>
        ) : (
          orgaos.map((cred, i) => (
            <Box key={cred.id}>
              {i > 0 && <Divider sx={{ my: 2 }} />}
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {TIPO_LABEL[cred.tipo] ?? cred.tipo}
              </Typography>
              <Grid container spacing={2}>
                <LinkField label="Link de acesso" value={cred.link} />
                <ReadField label="Usuário" value={cred.usuario} />
                <SecretField label="Senha" value={revMap.get(cred.id)?.senha ?? null} masked={!revelado && cred.tem_senha} />
              </Grid>
            </Box>
          ))
        )}
      </SectionCard>
    </Box>
  );
}

function RevelarButton({
  revelado,
  revelando,
  onRevelar,
  disabled,
}: {
  revelado: boolean;
  revelando: boolean;
  onRevelar: () => void;
  disabled?: boolean;
}) {
  if (revelado) return null;
  return (
    <Button
      size="small"
      variant="outlined"
      color="warning"
      startIcon={revelando ? <CircularProgress size={16} /> : <VisibilityIcon />}
      onClick={onRevelar}
      disabled={revelando || disabled}
    >
      Revelar
    </Button>
  );
}

function LinkField({ label, value }: { label: string; value: string | null }) {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.25 }}>
        {value ? (
          <Link href={value} target="_blank" rel="noopener" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, wordBreak: 'break-all' }}>
            {value}
            <OpenInNewIcon sx={{ fontSize: 13 }} />
          </Link>
        ) : (
          <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>
        )}
      </Typography>
    </Grid>
  );
}

function SecretField({ label, value, masked }: { label: string; value: string | null; masked: boolean }) {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography variant="body2" sx={{ mt: 0.25, fontFamily: value ? 'monospace' : 'inherit' }}>
          {value ?? (masked ? '••••••••' : '—')}
        </Typography>
        {value && (
          <Tooltip title="Copiar">
            <IconButton size="small" onClick={() => navigator.clipboard.writeText(value)}>
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Grid>
  );
}

