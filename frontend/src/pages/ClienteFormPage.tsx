import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage, isConflict } from '../api/client';
import { fetchEstruturaFicha, fetchFicha, updateFolha } from '../api/resources';
import { SectionCard } from '../components/ui';
import {
  FILIACAO_SINDICAL_OPCOES,
  PROCURACAO_DATA,
  SIM_NAO_NA,
  SITUACAO_CONVENCAO_OPCOES,
  VENCIMENTO_LAUDO_DATA,
  derivarRecolhimento,
  quadroVisivel,
} from '../lib/listas';
import {
  NUMBER_FIELDS,
  SCALAR_CARDS,
  SCALAR_KEYS,
  type FieldDef,
} from '../lib/ficha-campos';
import type { ClienteSindicato } from '../types';

const TIPO_LABEL: Record<string, string> = {
  seguro_desemprego: 'Seguro Desemprego',
  empregado_domestico: 'Empregado Doméstico',
};


interface OrgaoState {
  id?: string;
  tipo: string;
  link: string;
  usuario: string;
  senha: string;
}

export function ClienteFormPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(SCALAR_KEYS.map((k) => [k, ''])),
  );
  const [regime, setRegime] = useState(''); // geral (só leitura aqui)
  const [sindicatos, setSindicatos] = useState<ClienteSindicato[]>([]);
  const [orgaos, setOrgaos] = useState<OrgaoState[]>([]);
  const [edUsuario, setEdUsuario] = useState('');
  const [edSenha, setEdSenha] = useState('');
  const [version, setVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: ficha, isLoading } = useQuery({ queryKey: ['ficha', id], queryFn: () => fetchFicha(id) });
  // Regra de quais quadros valem para cada tipo de cliente — vem do backend,
  // que é quem também a usa para calcular a completude no dashboard.
  const { data: estrutura } = useQuery({
    queryKey: ['estrutura-ficha'],
    queryFn: fetchEstruturaFicha,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!ficha) return;
    const folha = (ficha.folha ?? {}) as unknown as Record<string, unknown>;
    setForm(Object.fromEntries(SCALAR_KEYS.map((k) => {
      const v = folha[k];
      return [k, v === null || v === undefined ? '' : String(v)];
    })));
    setRegime(ficha.regime_tributacao ?? '');
    setSindicatos(ficha.sindicatos.length ? ficha.sindicatos : []);
    setOrgaos(
      ficha.credenciais
        .filter((c) => c.tipo !== 'empregado_domestico')
        .map((c) => ({ id: c.id, tipo: TIPO_LABEL[c.tipo] ?? c.tipo, link: c.link ?? '', usuario: c.usuario ?? '', senha: '' })),
    );
    const ed = ficha.credenciais.find((c) => c.tipo === 'empregado_domestico');
    setEdUsuario(ed?.usuario ?? '');
    setEdSenha('');
    setVersion(ficha.folha?.version ?? 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ficha]);

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConflict(false);

    const payload: Record<string, unknown> = {};
    for (const key of SCALAR_KEYS) {
      const raw = form[key]?.trim() ?? '';
      payload[key] = raw === '' ? null : NUMBER_FIELDS.has(key) ? Number(raw) : raw;
    }

    // Código de recolhimento e alíquota são derivados do par (tipo de segurado,
    // opção de recolhimento). Só sobrescreve quando o par resolve: com um dos
    // dois em branco — o caso de toda ficha importada, já que a opção de
    // recolhimento só passou a existir agora — gravar o derivado apagaria o
    // código e a alíquota que vieram da planilha. Nesse caso deixamos os campos
    // fora do payload, e o UPDATE parcial preserva o que está no banco.
    const derivado = derivarRecolhimento(
      form.inss_tipo_segurado ?? '',
      form.inss_opcao_recolhimento ?? '',
    );
    if (derivado) {
      payload.inss_codigo_recolhimento = derivado.codigo;
      payload.inss_aliquota = Number(derivado.aliquota);
    } else {
      delete payload.inss_codigo_recolhimento;
      delete payload.inss_aliquota;
    }

    // A data do laudo só faz sentido quando a situação é "Data informada";
    // nas demais ("Desobrigada", "Não possui Laudo") ela é limpa, senão ficaria
    // um vencimento órfão alimentando os alertas do dashboard. Só mexe quando a
    // situação foi de fato preenchida — senão uma ficha antiga, que só tem a
    // data, perderia o vencimento no primeiro salvamento.
    if (
      form.data_vencimento_laudo_situacao &&
      form.data_vencimento_laudo_situacao !== VENCIMENTO_LAUDO_DATA
    ) {
      payload.data_vencimento_laudo = null;
    }

    // Mesma lógica para as procurações: "Sem procuração" / "Não se aplica"
    // não convivem com uma data de vencimento.
    for (const [situacao, data] of [
      ['venc_procuracao_rfb_situacao', 'venc_procuracao_rfb'],
      ['venc_procuracao_det_fgts_situacao', 'venc_procuracao_det_fgts'],
      ['venc_procuracao_econsignado_situacao', 'venc_procuracao_econsignado'],
    ] as const) {
      if (form[situacao] && form[situacao] !== PROCURACAO_DATA) payload[data] = null;
    }

    payload.sindicatos = sindicatos
      .filter((s) => s.sindicato || s.situacao_convencao || s.recolhe_contribuicao)
      .map((s) => ({
        sindicato: s.sindicato || null,
        convencao_aplicavel_nome: s.convencao_aplicavel_nome || null,
        situacao_convencao: s.situacao_convencao || null,
        recolhe_contribuicao: s.recolhe_contribuicao || null,
      }));

    const orgaosPayload = orgaos
      .filter((o) => o.tipo.trim())
      .map((o) => ({
        ...(o.id ? { id: o.id } : {}),
        tipo: o.tipo.trim(),
        link: o.link || null,
        usuario: o.usuario || null,
        ...(o.senha ? { senha: o.senha } : {}),
      }));
    payload.credenciais = {
      orgaos: orgaosPayload,
      empregado_domestico: {
        usuario: edUsuario || null,
        ...(edSenha ? { senha: edSenha } : {}),
      },
    };

    setSaving(true);
    try {
      await updateFolha(id, { ...payload, version });
      queryClient.invalidateQueries({ queryKey: ['ficha', id] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      navigate(`/clientes/${id}`);
    } catch (err) {
      if (isConflict(err)) setConflict(true);
      else setError(apiErrorMessage(err, 'Não foi possível salvar os dados.'));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!ficha) return <Alert severity="error">Não foi possível carregar o cliente.</Alert>;

  const renderField = (f: FieldDef) => {
    if (f.showIf && !f.showIf(form)) return null;

    // Campos derivados (código de recolhimento e alíquota) não são digitados:
    // saem do par tipo de segurado + opção de recolhimento.
    if (f.derived) {
      const derivado = derivarRecolhimento(
        form.inss_tipo_segurado ?? '',
        form.inss_opcao_recolhimento ?? '',
      );
      const valorDerivado =
        f.key === 'inss_codigo_recolhimento' ? derivado?.codigo : derivado?.aliquota;
      return (
        <Grid key={f.key} item xs={12} sm={6} md={4}>
          <TextField
            label={f.label}
            value={valorDerivado ?? ''}
            fullWidth
            size="small"
            disabled
            helperText="Preenchido automaticamente"
          />
        </Grid>
      );
    }

    const value = form[f.key] ?? '';
    if (f.type === 'select') {
      const opts = f.options ?? [];
      const options = value && !opts.includes(value) ? [...opts, value] : opts;
      return (
        <Grid key={f.key} item xs={12} sm={f.wide ? 12 : 6} md={f.wide ? 12 : 4}>
          <TextField select label={f.label} value={value} onChange={(e) => setField(f.key, e.target.value)} fullWidth size="small">
            <MenuItem value=""><em>Não informado</em></MenuItem>
            {options.map((o) => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </TextField>
        </Grid>
      );
    }
    return (
      <Grid key={f.key} item xs={12} sm={f.wide ? 12 : 6} md={f.wide ? 12 : 4}>
        <TextField
          label={f.label}
          value={value}
          onChange={(e) => setField(f.key, e.target.value)}
          fullWidth
          size="small"
          type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
          multiline={f.type === 'multiline'}
          minRows={f.type === 'multiline' ? 3 : undefined}
          InputLabelProps={f.type === 'date' ? { shrink: true } : undefined}
        />
      </Grid>
    );
  };

  const cardByTitle = (title: string) => SCALAR_CARDS.find((c) => c.title === title)!;

  /**
   * Cada tipo de cliente usa um subconjunto dos quadros da ficha. A regra vem
   * do backend; enquanto ela não chega, cai na cópia local para não piscar a
   * tela nem esconder quadro indevidamente.
   */
  const visivel = (titulo: string) =>
    quadroVisivel(titulo, ficha.tipo_cliente, estrutura?.quadrosPorTipo);

  // Função que retorna JSX (NÃO um componente) — evita remontar o subtree a cada
  // tecla, o que fazia os inputs perderem o foco.
  const scalarCard = (title: string) => {
    if (!visivel(title)) return null;
    const card = cardByTitle(title);
    return (
      <SectionCard title={card.title}>
        <Grid container spacing={2}>{card.fields.map(renderField)}</Grid>
      </SectionCard>
    );
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Button startIcon={<ArrowBackIcon />} component={RouterLink} to={`/clientes/${id}`} sx={{ mb: 2 }}>
        Cancelar
      </Button>
      <Typography variant="h5">Editar dados da empresa</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {ficha.nome} · Código {ficha.codigo} — os dados gerais (razão social, CNPJ, tipo, situação) são editados no menu “Informações gerais”.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {conflict && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Estes dados foram alterados por outro usuário enquanto você editava. Recarregue antes de salvar novamente.
        </Alert>
      )}

      {/* Informações tributárias (com Regime só leitura) */}
      {visivel('Informações tributárias') && (
        <SectionCard title="Informações tributárias">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Regime de tributação"
                value={regime}
                fullWidth
                size="small"
                disabled
                helperText="Editado em Informações gerais"
              />
            </Grid>
            {cardByTitle('Informações tributárias').fields.map(renderField)}
          </Grid>
        </SectionCard>
      )}

      {scalarCard('Admissão')}
      {scalarCard('Fechamento da folha')}

      {/* Informações sindicais (vários) */}
      {visivel('Informações sindicais') && (
      <SectionCard
        title="Informações sindicais"
        action={
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setSindicatos([...sindicatos, { sindicato: '', situacao_convencao: '', recolhe_contribuicao: '' }])}
          >
            Adicionar
          </Button>
        }
      >
        <Stack spacing={2}>
          {sindicatos.map((s, i) => {
            const set = (patch: Partial<ClienteSindicato>) =>
              setSindicatos(sindicatos.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <Box key={s.id ?? i} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">Sindicato {i + 1}</Typography>
                  <IconButton size="small" color="error" onClick={() => setSindicatos(sindicatos.filter((_, j) => j !== i))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      select
                      label="Filiação sindical"
                      value={s.sindicato ?? ''}
                      onChange={(e) => set({ sindicato: e.target.value })}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value=""><em>Não informado</em></MenuItem>
                      {(s.sindicato && !FILIACAO_SINDICAL_OPCOES.includes(s.sindicato)
                        ? [...FILIACAO_SINDICAL_OPCOES, s.sindicato]
                        : FILIACAO_SINDICAL_OPCOES
                      ).map((o) => (
                        <MenuItem key={o} value={o}>{o}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      label="Situação da convenção"
                      value={s.situacao_convencao ?? ''}
                      onChange={(e) => set({ situacao_convencao: e.target.value })}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value=""><em>Não informado</em></MenuItem>
                      {SITUACAO_CONVENCAO_OPCOES.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField select label="Recolhe contribuições sindicais?" value={s.recolhe_contribuicao ?? ''} onChange={(e) => set({ recolhe_contribuicao: e.target.value })} fullWidth size="small">
                      <MenuItem value=""><em>Não informado</em></MenuItem>
                      {SIM_NAO_NA.map((o) => (<MenuItem key={o} value={o}>{o}</MenuItem>))}
                    </TextField>
                  </Grid>
                </Grid>
              </Box>
            );
          })}
          {sindicatos.length === 0 && <Typography variant="body2" color="text.disabled">Nenhum sindicato adicionado.</Typography>}
        </Stack>
      </SectionCard>
      )}

      {scalarCard('Informações sobre SST')}
      {scalarCard('Forma de envio dos documentos')}
      {scalarCard('Dados de contribuintes individuais')}

      {/* Empregador doméstico */}
      {visivel('Dados do empregador doméstico') && (
        <SectionCard title="Dados do empregador doméstico">
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            A senha é armazenada cifrada. Deixe em branco para manter a atual.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><TextField label="Usuário e-social" value={edUsuario} onChange={(e) => setEdUsuario(e.target.value)} fullWidth size="small" /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Senha" type="password" value={edSenha} onChange={(e) => setEdSenha(e.target.value)} fullWidth size="small" placeholder="••••••" /></Grid>
          </Grid>
        </SectionCard>
      )}

      {scalarCard('Procurações')}

      {/* Senhas (por órgão) */}
      <SectionCard
        title="Senhas"
        action={
          <Button size="small" startIcon={<AddIcon />} onClick={() => setOrgaos([...orgaos, { tipo: '', link: '', usuario: '', senha: '' }])}>
            Adicionar órgão
          </Button>
        }
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          As senhas são armazenadas cifradas. Deixe a senha em branco para manter a atual.
        </Typography>
        <Stack spacing={2}>
          {orgaos.map((o, i) => {
            const set = (patch: Partial<OrgaoState>) => setOrgaos(orgaos.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <Box key={o.id ?? i}>
                {i > 0 && <Divider sx={{ mb: 2 }} />}
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={3}><TextField label="Órgão" value={o.tipo} onChange={(e) => set({ tipo: e.target.value })} fullWidth size="small" /></Grid>
                  <Grid item xs={12} md={3}><TextField label="Link de acesso" value={o.link} onChange={(e) => set({ link: e.target.value })} fullWidth size="small" /></Grid>
                  <Grid item xs={12} md={3}><TextField label="Usuário" value={o.usuario} onChange={(e) => set({ usuario: e.target.value })} fullWidth size="small" /></Grid>
                  <Grid item xs={11} md={2}><TextField label="Senha" type="password" value={o.senha} onChange={(e) => set({ senha: e.target.value })} fullWidth size="small" placeholder="••••••" /></Grid>
                  <Grid item xs={1}>
                    <IconButton size="small" color="error" onClick={() => setOrgaos(orgaos.filter((_, j) => j !== i))}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>
              </Box>
            );
          })}
          {orgaos.length === 0 && <Typography variant="body2" color="text.disabled">Nenhum órgão adicionado.</Typography>}
        </Stack>
      </SectionCard>

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button component={RouterLink} to={`/clientes/${id}`}>Cancelar</Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </Stack>
    </Box>
  );
}
