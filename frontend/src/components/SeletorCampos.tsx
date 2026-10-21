import { Box, Button, Checkbox, FormControlLabel, Paper, Stack, Typography } from '@mui/material';
import type { QuadroCamposRelatorio } from '../types';

/**
 * Escolha dos campos do relatório personalizado: um bloco por quadro da ficha,
 * com "marcar todos" no quadro e, no topo, para a ficha inteira.
 */
export function SeletorCampos({
  catalogo,
  selecionados,
  onChange,
}: {
  catalogo: QuadroCamposRelatorio[];
  selecionados: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const todos = catalogo.flatMap((q) => q.campos.map((c) => c.chave));

  const alternar = (chaves: string[], marcar: boolean) => {
    const next = new Set(selecionados);
    for (const k of chaves) (marcar ? next.add(k) : next.delete(k));
    onChange(next);
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Button size="small" onClick={() => alternar(todos, true)}>Marcar todos</Button>
        <Button size="small" onClick={() => alternar(todos, false)} disabled={selecionados.size === 0}>
          Limpar
        </Button>
        <Typography variant="caption" color="text.secondary">
          {selecionados.size} de {todos.length} campo(s) selecionado(s) — código e nome da empresa sempre entram.
        </Typography>
      </Stack>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
        {catalogo.map((q) => {
          const chaves = q.campos.map((c) => c.chave);
          const marcados = chaves.filter((k) => selecionados.has(k)).length;
          return (
            <Paper key={q.quadro} variant="outlined" sx={{ p: 1.5 }}>
              <FormControlLabel
                label={<Typography variant="body2" sx={{ fontWeight: 700 }}>{q.quadro}</Typography>}
                control={
                  <Checkbox
                    size="small"
                    checked={marcados === chaves.length}
                    indeterminate={marcados > 0 && marcados < chaves.length}
                    onChange={(e) => alternar(chaves, e.target.checked)}
                  />
                }
              />
              <Stack sx={{ pl: 3 }}>
                {q.campos.map((c) => (
                  <FormControlLabel
                    key={c.chave}
                    label={<Typography variant="body2">{c.rotulo}</Typography>}
                    control={
                      <Checkbox
                        size="small"
                        checked={selecionados.has(c.chave)}
                        onChange={(e) => alternar([c.chave], e.target.checked)}
                      />
                    }
                  />
                ))}
              </Stack>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
