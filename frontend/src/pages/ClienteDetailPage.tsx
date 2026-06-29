import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LockIcon from '@mui/icons-material/Lock';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import { fetchCliente, revelarCredenciais } from '../api/resources';
import { ReadField, SectionCard, SituacaoChip, formatDate, formatMoney } from '../components/ui';
import type { CredencialRevelada } from '../types';

const TIPO_LABEL: Record<string, string> = {
  seguro_desemprego: 'Seguro Desemprego',
  empregado_domestico: 'Empregado Doméstico',
};

export function ClienteDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data: cliente, isLoading, error } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => fetchCliente(id),
  });

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
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/clientes/${id}/editar`)}
        >
          Editar
        </Button>
      </Stack>

      <SectionCard title="Informações gerais">
        <Grid container spacing={2}>
          <ReadField label="Código" value={cliente.codigo} />
          <ReadField label="Nome" value={cliente.nome} />
          <ReadField label="CNPJ" value={cliente.cnpj} />
          <ReadField label="Tipo de cliente" value={cliente.tipo_cliente} />
          <ReadField label="Regime de tributação" value={cliente.regime_tributacao} />
          <ReadField label="Situação" value={cliente.situacao} />
          <ReadField label="Data do evento da situação" value={formatDate(cliente.data_evento_situacao)} />
          <ReadField label="Responsável" value={cliente.responsavel} />
        </Grid>
      </SectionCard>

      <SectionCard title="Folha de pagamento">
        <Grid container spacing={2}>
          <ReadField label="Possui folha?" value={cliente.possui_folha} />
          <ReadField label="Forma de pagamento" value={cliente.forma_pagamento_salarios} />
          <ReadField label="Apura o ponto pelo escritório?" value={cliente.apura_ponto_escritorio} />
          <ReadField label="Realiza lançamentos?" value={cliente.realiza_lancamentos} />
          <ReadField label="Concede plano de saúde?" value={cliente.concede_plano_saude} />
          <ReadField label="Operadora do plano" value={cliente.plano_operadora} />
          <ReadField label="Beneficiários" value={cliente.plano_beneficiarios} />
          <ReadField label='Fator "R"?' value={cliente.fator_r} />
          <ReadField label="Atividade concomitante?" value={cliente.atividade_concomitante} />
          <ReadField label="Construção civil?" value={cliente.construcao_civil} />
          <ReadField label="CPRB?" value={cliente.cprb} />
          <ReadField label="Prazo para envio das folhas" value={cliente.prazo_envio_folhas} />
          <ReadField label="Gera folha via rotina automática?" value={cliente.folha_rotina_automatica} />
          <ReadField label="Observações importantes sobre a folha" value={cliente.observacoes_folha} wide pre />
        </Grid>
      </SectionCard>

      <SectionCard title="Admissão">
        <Grid container spacing={2}>
          <ReadField label="Prazo do contrato de experiência" value={cliente.prazo_contrato_experiencia} />
          <ReadField label="Lançamentos fixos" value={cliente.lancamentos_fixos} wide pre />
          <ReadField label="Particularidades do cliente" value={cliente.particularidades_cliente} wide pre />
          <ReadField label="Relatórios gerados na admissão" value={cliente.relatorios_admissao} wide pre />
        </Grid>
      </SectionCard>

      <SectionCard title="Envio de documentos">
        <Grid container spacing={2}>
          <ReadField label="Meio" value={cliente.envio_meio} />
          <ReadField label="Documento" value={cliente.envio_documento} />
          <ReadField label="Contato" value={cliente.envio_contato} wide pre />
        </Grid>
      </SectionCard>

      <SectionCard title="Sindicato e convenção">
        <Grid container spacing={2}>
          <ReadField label="Sindicato ao qual está sujeito" value={cliente.sindicato} wide />
          <ReadField
            label="Convenção aplicável (texto)"
            value={cliente.convencao_aplicavel_nome}
          />
          <ReadField
            label="Convenção vinculada (CCT)"
            value={
              cliente.convencao_id ? (
                <Link component={RouterLink} to={`/cct/${cliente.convencao_id}`}>
                  {cliente.convencao_apelido ?? 'Ver convenção'}
                </Link>
              ) : (
                <Chip size="small" label="Não vinculada" variant="outlined" />
              )
            }
          />
        </Grid>
      </SectionCard>

      <SectionCard title="Saúde e segurança do trabalho (SST)">
        <Grid container spacing={2}>
          <ReadField label="Possui laudos de SST?" value={cliente.possui_laudos_sst} />
          <ReadField label="Empresa responsável pela SST" value={cliente.empresa_responsavel_sst} />
          <ReadField label="Vencimento do laudo" value={formatDate(cliente.data_vencimento_laudo)} />
        </Grid>
      </SectionCard>

      <SectionCard title="Procurações">
        <Grid container spacing={2}>
          <ReadField label="Vencimento RFB" value={formatDate(cliente.venc_procuracao_rfb)} />
          <ReadField label="Vencimento DET e FGTS Digital" value={formatDate(cliente.venc_procuracao_det_fgts)} />
          <ReadField label="Vencimento e-Consignado" value={formatDate(cliente.venc_procuracao_econsignado)} />
          <ReadField label="E-mails que recebem o DET" value={cliente.emails_notificacao_det} wide />
        </Grid>
      </SectionCard>

      <SectionCard title="Guia INSS autônomo/facultativo">
        <Grid container spacing={2}>
          <ReadField label="NIT" value={cliente.inss_nit} />
          <ReadField label="Código de recolhimento" value={cliente.inss_codigo_recolhimento} />
          <ReadField
            label="Salário de contribuição"
            value={cliente.inss_salario_contribuicao ? formatMoney(cliente.inss_salario_contribuicao) : null}
          />
          <ReadField label="Alíquota" value={cliente.inss_aliquota} />
        </Grid>
      </SectionCard>

      <CredenciaisSection clienteId={id} cliente={cliente} />
    </Box>
  );
}

function CredenciaisSection({
  clienteId,
  cliente,
}: {
  clienteId: string;
  cliente: { credenciais: { tipo: string; usuario: string | null; email: string | null; tem_senha: boolean }[] };
}) {
  const [revelado, setRevelado] = useState<CredencialRevelada[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revelar() {
    setLoading(true);
    setError(null);
    try {
      setRevelado(await revelarCredenciais(clienteId));
    } catch {
      setError('Não foi possível revelar as credenciais.');
    } finally {
      setLoading(false);
    }
  }

  const reveladoMap = new Map(revelado?.map((r) => [r.tipo, r]));

  return (
    <SectionCard
      title="Credenciais de portais (dados sensíveis)"
      icon={<LockIcon fontSize="small" color="warning" />}
      action={
        !revelado ? (
          <Button
            size="small"
            variant="outlined"
            color="warning"
            startIcon={loading ? <CircularProgress size={16} /> : <VisibilityIcon />}
            onClick={revelar}
            disabled={loading || cliente.credenciais.length === 0}
          >
            Revelar
          </Button>
        ) : (
          <Button size="small" onClick={() => setRevelado(null)}>
            Ocultar
          </Button>
        )
      }
    >
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {cliente.credenciais.length === 0 ? (
        <Typography variant="body2" color="text.disabled">
          Sem credenciais cadastradas.
        </Typography>
      ) : (
        cliente.credenciais.map((cred) => {
          const r = reveladoMap.get(cred.tipo);
          return (
            <Box key={cred.tipo} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {TIPO_LABEL[cred.tipo] ?? cred.tipo}
              </Typography>
              <Grid container spacing={2}>
                <ReadField label="Usuário" value={cred.usuario} />
                <SecretField label="Senha" value={r ? r.senha : null} masked={!revelado && cred.tem_senha} />
                {cred.email !== null && <ReadField label="E-mail" value={cred.email} />}
                {r?.email_senha != null && <SecretField label="Senha do e-mail" value={r.email_senha} masked={false} />}
              </Grid>
            </Box>
          );
        })
      )}
    </SectionCard>
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
