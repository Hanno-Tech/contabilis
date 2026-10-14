import { Autocomplete, Grid, MenuItem, TextField, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { SEPARADOR_MULTI } from '../lib/contabil-campos';
import type { FieldDef } from '../lib/ficha-campos';

/**
 * Campo de formulário a partir de um `FieldDef` do catálogo. Usado pelas telas
 * do setor contábil (ficha e imóveis); o valor é sempre texto no estado do
 * formulário, como na ficha do setor pessoal.
 *
 * `questionario`: as perguntas da planilha contábil são longas demais para o
 * rótulo flutuante do MUI (ficavam cortadas). Nesse modo todo campo leva a
 * pergunta escrita acima, em duas colunas, para o quadro inteiro alinhar.
 */
export function campoEditavel(
  f: FieldDef,
  form: Record<string, string>,
  setField: (key: string, value: string) => void,
  questionario = false,
) {
  if (f.showIf && !f.showIf(form)) return null;
  const value = form[f.key] ?? '';
  const opts = f.options ?? [];
  const rotuloId = `${f.key}-rotulo`;
  const label = questionario ? undefined : f.label;
  const grid = questionario
    ? ({ xs: 12, md: f.wide ? 12 : 6 } as const)
    : ({ xs: 12, sm: f.wide ? 12 : 6, md: f.wide ? 12 : 4 } as const);

  const celula = (campo: ReactNode) => (
    <Grid key={f.key} item {...grid}>
      {questionario && (
        <Typography id={rotuloId} component="label" htmlFor={f.key} variant="body2" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
          {f.label}
        </Typography>
      )}
      {campo}
    </Grid>
  );

  if (f.type === 'select') {
    // Valor gravado que saiu da lista continua aparecendo, para não sumir no salvamento.
    const options = value && !opts.includes(value) ? [...opts, value] : opts;
    return celula(
      <TextField
        select
        label={label}
        SelectProps={questionario ? { labelId: rotuloId } : undefined}
        value={value}
        onChange={(e) => setField(f.key, e.target.value)}
        fullWidth
        size="small"
      >
        <MenuItem value=""><em>Não informado</em></MenuItem>
        {options.map((o) => (
          <MenuItem key={o} value={o}>{o}</MenuItem>
        ))}
      </TextField>,
    );
  }

  if (f.type === 'combo') {
    return celula(
      <Autocomplete
        freeSolo
        id={f.key}
        options={opts}
        value={value}
        onChange={(_, v) => setField(f.key, v ?? '')}
        onInputChange={(_, v, reason) => reason === 'input' && setField(f.key, v)}
        renderInput={(params) => (
          <TextField {...params} label={label} size="small" helperText="Escolha da lista ou digite um novo" />
        )}
      />,
    );
  }

  if (f.type === 'multiselect') {
    const selecionados = value ? value.split(SEPARADOR_MULTI).filter(Boolean) : [];
    return celula(
      <Autocomplete
        multiple
        disableCloseOnSelect
        id={f.key}
        options={[...new Set([...opts, ...selecionados])]}
        value={selecionados}
        onChange={(_, v) => setField(f.key, v.join(SEPARADOR_MULTI))}
        renderInput={(params) => <TextField {...params} label={label} size="small" />}
      />,
    );
  }

  return celula(
    <TextField
      id={f.key}
      label={label}
      value={value}
      onChange={(e) => setField(f.key, e.target.value)}
      fullWidth
      size="small"
      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
      inputProps={f.type === 'number' ? { min: 0, step: '0.01' } : undefined}
      multiline={f.type === 'multiline'}
      minRows={f.type === 'multiline' ? 3 : undefined}
      InputLabelProps={f.type === 'date' ? { shrink: true } : undefined}
    />,
  );
}
