import { TextField, type TextFieldProps } from '@mui/material';
import { useEffect, useState } from 'react';
import {
  brParaIso,
  isoParaBr,
  mascaraData,
  mesBrParaIso,
  mesIsoParaBr,
} from '../lib/datas';

type Props = Omit<TextFieldProps, 'value' | 'onChange' | 'type' | 'select'> & {
  /** ISO: 'AAAA-MM-DD' (ou 'AAAA-MM' com `mes`). Vazio quando em branco ou incompleto. */
  value: string;
  onChange: (iso: string) => void;
  /** Competência (mês/ano) em vez de data completa. */
  mes?: boolean;
};

/**
 * Campo de data no padrão brasileiro (dd/mm/aaaa, ou mm/aaaa com `mes`).
 *
 * Substitui o `type="date"`/`type="month"` do navegador, que mostra o formato
 * do idioma do sistema. Quem usa continua lidando com ISO: o campo só emite um
 * valor quando a data digitada existe, e '' enquanto está incompleta.
 */
export function CampoData({ value, onChange, mes = false, helperText, ...rest }: Props) {
  const paraBr = mes ? mesIsoParaBr : isoParaBr;
  const paraIso = mes ? mesBrParaIso : brParaIso;
  const tamanho = mes ? 7 : 10;

  const [texto, setTexto] = useState(() => paraBr(value));

  // Valor trocado de fora (carregou o registro, limpou o filtro): reflete no texto.
  // Se o texto digitado já resolve para esse valor, não mexe — senão apagaria a digitação.
  useEffect(() => {
    if (value !== paraIso(texto)) setTexto(paraBr(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const invalido = texto.length === tamanho && !paraIso(texto);

  return (
    <TextField
      {...rest}
      value={texto}
      onChange={(e) => {
        const mascarado = mascaraData(e.target.value, mes);
        setTexto(mascarado);
        onChange(paraIso(mascarado));
      }}
      placeholder={mes ? 'mm/aaaa' : 'dd/mm/aaaa'}
      inputProps={{ inputMode: 'numeric', maxLength: tamanho, ...rest.inputProps }}
      InputLabelProps={{ shrink: true, ...rest.InputLabelProps }}
      error={rest.error || invalido}
      helperText={invalido ? (mes ? 'Mês inválido' : 'Data inválida') : helperText}
    />
  );
}
