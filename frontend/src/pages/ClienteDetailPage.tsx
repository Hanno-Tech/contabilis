import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LockIcon from '@mui/icons-material/Lock';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
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
import { fetchFicha, listOcorrencias, revelarCredenciais } from '../api/resources';
import { EmptyState, ReadField, SectionCard, SituacaoChip, formatDate, formatMoney } from '../components/ui';
import { OcorrenciaStatusChip } from './OcorrenciasListPage';
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

      {/* 2. Informações tributárias */}
      <SectionCard title="Informações tributárias">
        <Grid container spacing={2}>
          <ReadField label="Regime de tributação" value={cliente.regime_tributacao} />
          <ReadField label='Fator "R"' value={folha.fator_r} />
          <ReadField label="Atividades concomitantes" value={folha.atividade_concomitante} />
          <ReadField label="INSS retido na NF?" value={folha.inss_retido_nf} />
          <ReadField label="Construção civil?" value={folha.construcao_civil} />
          <ReadField label="CPRB?" value={folha.cprb} />
          <ReadField label="Encargos recolhidos pelo escritório" value={folha.encargos_recolhidos_escritorio} wide pre />
        </Grid>
      </SectionCard>

      {/* 3. Admissão */}
      <SectionCard title="Admissão">
        <Grid container spacing={2}>
          <ReadField label="Concede plano de saúde?" value={folha.concede_plano_saude} />
          <ReadField label="Operadora do plano" value={folha.plano_operadora} />
          <ReadField label="Beneficiários do plano" value={folha.plano_beneficiarios} />
          <ReadField label="Forma de pagamento dos salários" value={folha.forma_pagamento_salarios} />
          <ReadField label="Prazo do contrato de experiência" value={folha.prazo_contrato_experiencia} />
          <ReadField label="Possui cargos insalubres ou perigosos?" value={folha.cargos_insalubres_perigosos} />
          <ReadField label="Possui lançamentos fixos?" value={folha.lancamentos_fixos} wide pre />
          <ReadField label="Relatórios admissionais" value={folha.relatorios_admissao} wide pre />
          <ReadField label="Especificidades do cliente" value={folha.particularidades_cliente} wide pre />
        </Grid>
      </SectionCard>

      {/* 4. Rescisão (a definir) */}
      <SectionCard title="Rescisão">
        <Typography variant="body2" color="text.disabled">
          Campos a definir.
        </Typography>
      </SectionCard>

      {/* 5. Fechamento da folha */}
      <SectionCard title="Fechamento da folha">
        <Grid container spacing={2}>
          <ReadField label="Possui folha?" value={folha.possui_folha} />
          <ReadField label="Responsável pelo fechamento da folha" value={folha.responsavel_fechamento_folha} />
          <ReadField label="Gera folha e relatórios pela rotina automática?" value={folha.folha_rotina_automatica} />
          <ReadField label="Código da rotina automática" value={folha.codigo_rotina_automatica} />
          <ReadField label="Data meta da entrega da folha" value={formatDate(folha.data_meta_entrega_folha)} />
          <ReadField label="Apura o ponto pelo escritório?" value={folha.apura_ponto_escritorio} />
          <ReadField label="Realiza lançamentos?" value={folha.realiza_lancamentos} />
          <ReadField label="Informações importantes no fechamento da folha" value={folha.observacoes_folha} wide pre />
        </Grid>
      </SectionCard>

      {/* 6. Informações sindicais (vários) */}
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
                <ReadField label="Sindicato" value={s.sindicato} wide />
                <ReadField
                  label="Convenção aplicável"
                  value={
                    s.convencao_id ? (
                      <Link component={RouterLink} to={`/cct/${s.convencao_id}`}>
                        {s.convencao_apelido ?? 'Ver convenção'}
                      </Link>
                    ) : (
                      s.convencao_aplicavel_nome
                    )
                  }
                />
                <ReadField label="Situação da convenção" value={s.convencao_situacao} />
                <ReadField label="Recolhe contribuições sindicais?" value={s.recolhe_contribuicao} />
              </Grid>
            </Box>
          ))
        )}
      </SectionCard>

      {/* 7. SST */}
      <SectionCard title="Informações sobre SST">
        <Grid container spacing={2}>
          <ReadField label="Possui laudo de SST?" value={folha.possui_laudos_sst} />
          <ReadField label="Empresa responsável" value={folha.empresa_responsavel_sst} />
          <ReadField label="Vencimento do laudo" value={formatDate(folha.data_vencimento_laudo)} />
          <ReadField label="Termo de ciência enviado (ausência de laudos)?" value={folha.termo_ciencia_sst} />
        </Grid>
      </SectionCard>

      {/* 8. Forma de envio dos documentos */}
      <SectionCard title="Forma de envio dos documentos">
        <Grid container spacing={2}>
          <ReadField label="Forma de envio" value={folha.envio_meio} />
          <ReadField label="Contato" value={folha.envio_contato} wide pre />
          <ReadField label="Observações" value={folha.envio_observacoes} wide pre />
        </Grid>
      </SectionCard>

      {/* 9. Dados de contribuintes individuais */}
      <SectionCard title="Dados de contribuintes individuais">
        <Grid container spacing={2}>
          <ReadField label="NIT" value={folha.inss_nit} />
          <ReadField label="Tipo de segurado" value={folha.inss_tipo_segurado} />
          <ReadField label="Código de recolhimento" value={folha.inss_codigo_recolhimento} />
          <ReadField
            label="Salário de contribuição"
            value={folha.inss_salario_contribuicao ? formatMoney(folha.inss_salario_contribuicao) : null}
          />
          <ReadField label="Alíquota" value={folha.inss_aliquota} />
        </Grid>
      </SectionCard>

      {/* 10. Empregador doméstico */}
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

      {/* 11. Procurações */}
      <SectionCard title="Procurações">
        <Grid container spacing={2}>
          <ReadField label="Procuração RFB" value={formatDate(folha.venc_procuracao_rfb)} />
          <ReadField label="Procuração DET" value={formatDate(folha.venc_procuracao_det)} />
          <ReadField label="Procuração FGTS Digital" value={formatDate(folha.venc_procuracao_fgts)} />
          <ReadField label="Procuração e-Consignado" value={formatDate(folha.venc_procuracao_econsignado)} />
          <ReadField label="E-mails que recebem o DET" value={folha.emails_notificacao_det} wide />
        </Grid>
      </SectionCard>

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

      {/* 13. Ocorrências */}
      <OcorrenciasResumo clienteId={id} />
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

function OcorrenciasResumo({ clienteId }: { clienteId: string }) {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ['ocorrencias', { cliente_id: clienteId }],
    queryFn: () => listOcorrencias({ cliente_id: clienteId }),
  });
  const ultimas = (data ?? []).slice(0, 3);

  return (
    <SectionCard
      title="Ocorrências"
      icon={<ReportProblemOutlinedIcon fontSize="small" color="primary" />}
      action={
        <Button size="small" onClick={() => navigate(`/ocorrencias?cliente=${clienteId}`)}>
          Ver todas
        </Button>
      }
    >
      {ultimas.length === 0 ? (
        <EmptyState message="Nenhuma ocorrência para este cliente." />
      ) : (
        <Stack divider={<Divider />} spacing={1.5}>
          {ultimas.map((o) => (
            <Box
              key={o.id}
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate(`/ocorrencias/${o.id}/editar`)}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(o.data)}
                </Typography>
                <OcorrenciaStatusChip situacao={o.situacao} />
              </Stack>
              <Typography variant="body2">{o.ocorrencia}</Typography>
            </Box>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
