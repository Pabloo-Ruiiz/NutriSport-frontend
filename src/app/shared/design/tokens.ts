/**
 * Tokens de diseño como constantes TypeScript (DESIGN.md §9.1).
 *
 * Es el ÚNICO sitio de src/app donde se permiten valores HEX: ECharts pinta en
 * canvas y no lee variables CSS. Los valores deben coincidir exactamente con
 * src/styles/tokens/_primitives.scss y _semantic.scss; si cambias uno, cambia
 * el otro.
 */
export const TOKENS = {
  /* Datos (§2.4) */
  kcal: '#0B9A5D', // --ns-data-kcal (green-600)
  proteina: '#2F6FEB', // --ns-data-protein
  hidratos: '#C47F00', // --ns-data-carbs
  grasa: '#D9467A', // --ns-data-fat
  actividad: '#0E7490', // --ns-data-activity
  peso: '#344054', // --ns-data-weight (ink-700)

  /* Neutros y texto (§2.2 y §2.5) */
  ink950: '#0B1220', // --ns-ink-950
  border: '#EAECF0', // --ns-border (gray-100)
  textSecondary: '#475467', // --ns-text-secondary (gray-600)
  textTertiary: '#5D6B82', // --ns-text-tertiary (gray-500)

  /* Estados (§2.6) */
  success: '#067647', // --ns-success
  warning: '#B54708', // --ns-warning
  error: '#B42318', // --ns-error
  info: '#175CD3', // --ns-info

  /* Tipografía (§3.1, base/_fonts.scss) */
  fontBody: "'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  fontDisplay: "'Manrope Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
} as const;

export type Token = keyof typeof TOKENS;
