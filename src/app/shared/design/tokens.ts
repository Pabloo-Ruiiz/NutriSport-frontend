/**
 * Tokens de diseño como constantes TypeScript (docs/DESIGN.md, tema oscuro).
 *
 * Es el ÚNICO sitio de src/app donde se permiten valores HEX: ECharts pinta en
 * canvas y no lee variables CSS. Los valores deben coincidir exactamente con
 * src/styles/tokens/_primitives.scss y _semantic.scss; si cambias uno, cambia
 * el otro.
 */
export const TOKENS = {
  /* Datos (versión clara para leerse sobre negro) */
  kcal: '#47CD89', // --ns-data-kcal
  proteina: '#84ADFF', // --ns-data-protein
  hidratos: '#FDB022', // --ns-data-carbs
  grasa: '#F38BB5', // --ns-data-fat
  actividad: '#22CCEE', // --ns-data-activity
  peso: '#C6C6C6', // --ns-data-weight (Pale Mist)

  /* Lienzo, texto y líneas */
  fondo: '#000000', // --ns-bg (Void Black): separadores entre sectores y celdas
  panel: '#070707', // --ns-surface: fondo del tooltip
  texto: '#FFFFFF', // --ns-text (Ghost White)
  linea: '#C6C6C6', // --ns-text-secondary (Pale Mist): línea del objetivo
  border: '#4D4D4D', // --ns-border (Ash Border)
  textSecondary: '#C6C6C6', // --ns-text-secondary (Pale Mist)
  textTertiary: '#999999', // --ns-text-tertiary (Fog)

  /* Estados */
  success: '#47CD89', // --ns-success
  warning: '#FDB022', // --ns-warning
  error: '#F97066', // --ns-error
  info: '#84ADFF', // --ns-info

  /* Radios */
  radiusMd: 5, // --ns-radius-md

  /* Tipografía (base/_fonts.scss) */
  fontBody: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  fontDisplay: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
} as const;

export type Token = keyof typeof TOKENS;
