import type { TipoComida } from '@core/models';

/**
 * Franjas de comida que se pueden elegir en el perfil, en el orden del día ("Almuerzo" es
 * MEDIA_MANANA). Las mismas que FranjasDelDia del backend.
 */
export const FRANJAS_ELEGIBLES: readonly TipoComida[] = [
  'DESAYUNO',
  'MEDIA_MANANA',
  'COMIDA',
  'MERIENDA',
  'PRE_ENTRENO',
  'POST_ENTRENO',
  'CENA',
];

/** Las de por defecto de cada número de comidas (las mismas que el backend para perfiles sin elegir). */
export function franjasPorDefecto(comidasPorDia: number): TipoComida[] {
  const base: TipoComida[] = ['DESAYUNO', 'COMIDA', 'CENA'];
  if (comidasPorDia >= 4) base.push('MERIENDA');
  if (comidasPorDia >= 5) base.push('MEDIA_MANANA');
  if (comidasPorDia >= 6) base.push('POST_ENTRENO');
  return FRANJAS_ELEGIBLES.filter((t) => base.includes(t));
}
