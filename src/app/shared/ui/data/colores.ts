/** Colores de datos (DESIGN.md §2.4) que aceptan los componentes de progreso. */
export type NsColorDato = 'kcal' | 'protein' | 'carbs' | 'fat' | 'activity';

/** Colores de estado (§2.6) para barras que no representan un macro. */
export type NsColorEstado = 'success' | 'warning' | 'error' | 'info';

const VARIABLES: Record<NsColorDato | NsColorEstado, string> = {
  kcal: 'var(--ns-data-kcal)',
  protein: 'var(--ns-data-protein)',
  carbs: 'var(--ns-data-carbs)',
  fat: 'var(--ns-data-fat)',
  activity: 'var(--ns-data-activity)',
  success: 'var(--ns-success)',
  warning: 'var(--ns-warning)',
  error: 'var(--ns-error)',
  info: 'var(--ns-info)',
};

/** Variable CSS del color (p. ej. "var(--ns-data-protein)"). */
export function colorCss(color: NsColorDato | NsColorEstado): string {
  return VARIABLES[color];
}

/** Proporción 0–1 de value sobre max (0 si max no es positivo). */
export function proporcion(value: number, max: number): number {
  if (!(max > 0) || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value / max));
}
