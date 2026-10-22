import tokens from '../../identity/editorial-v1/tokens.json';

/** Contrato compartilhado. Fontes precisam ser carregadas localmente pelo projeto consumidor. */
export const editorialIdentity = tokens;
export const editorialStyles = {
  paper: {backgroundColor: tokens.colors.paper, color: tokens.colors.ink},
  dark: {backgroundColor: tokens.colors.ink, color: tokens.colors.paper},
  display: {fontFamily: `${tokens.typography.display.family}, serif`},
  sans: {fontFamily: `${tokens.typography.sans.family}, sans-serif`},
  mono: {fontFamily: `${tokens.typography.mono.family}, monospace`},
} as const;
