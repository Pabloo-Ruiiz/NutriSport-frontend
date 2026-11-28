// Funciones puras del planificador (DESIGN.md §7.10): no calculan nutrientes, solo ordenan y
// agrupan lo que devuelve el servidor.
import type { ComidaPlanificadaResponse, DiaMenuResponse, MenuResponse, TipoComida } from '@core/models';
import { FRANJAS_ELEGIBLES } from '@core/util/franjas';
import { desdeFechaApi, lunesDeLaSemana, rangoDias, sumarDias } from '@core/util/fechas';
import { formatearNumero } from '@shared/pipes/formato';

/** Franjas que siempre tienen fila en la rejilla; el resto, solo si hay comidas de ese tipo. */
export const FRANJAS_FIJAS: readonly TipoComida[] = ['DESAYUNO', 'COMIDA', 'MERIENDA', 'CENA'];

/** Una columna de la semana: la fecha y su día del menú (null si el menú no cubre ese día). */
export interface ColumnaSemana {
  fecha: string;
  dia: DiaMenuResponse | null;
}

const MES = new Intl.DateTimeFormat('es-ES', { month: 'short' });
const DIA_SEMANA = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });

const mes = (fecha: string) => MES.format(desdeFechaApi(fecha)).replace('.', '');

/** "23–29 nov 2026", "30 nov – 6 dic 2026" y, si cambia el año, "28 dic 2026 – 3 ene 2027". */
export function etiquetaSemana(lunes: string): string {
  const domingo = sumarDias(lunes, 6);
  const dia = (f: string) => Number(f.slice(8, 10));
  if (lunes.slice(0, 4) !== domingo.slice(0, 4))
    return `${dia(lunes)} ${mes(lunes)} ${lunes.slice(0, 4)} – ${dia(domingo)} ${mes(domingo)} ${domingo.slice(0, 4)}`;
  if (lunes.slice(5, 7) !== domingo.slice(5, 7))
    return `${dia(lunes)} ${mes(lunes)} – ${dia(domingo)} ${mes(domingo)} ${domingo.slice(0, 4)}`;
  return `${dia(lunes)}–${dia(domingo)} ${mes(domingo)} ${domingo.slice(0, 4)}`;
}

/** "Lun" para la cabecera de cada día. */
export function diaSemanaCorto(fecha: string): string {
  const texto = DIA_SEMANA.format(desdeFechaApi(fecha)).replace('.', '');
  return texto.charAt(0).toLocaleUpperCase('es-ES') + texto.slice(1);
}

/** Las 7 fechas de la semana de `lunes` con el día del menú que cae en cada una. */
export function columnasSemana(menu: MenuResponse | null, lunes: string): ColumnaSemana[] {
  const porFecha = new Map((menu?.dias ?? []).map((d) => [d.fecha, d]));
  return rangoDias(lunes, sumarDias(lunes, 6)).map((fecha) => ({ fecha, dia: porFecha.get(fecha) ?? null }));
}

/** Franja de una comida: sin tipo cuenta como OTRO. */
export function franjaDe(comida: Pick<ComidaPlanificadaResponse, 'tipoComida'>): TipoComida {
  return comida.tipoComida ?? 'OTRO';
}

/** Orden de las filas: el del día, como el reparto del backend (pre/post-entreno antes de la cena). */
const ORDEN_FILAS: readonly TipoComida[] = [...FRANJAS_ELEGIBLES, 'OTRO'];

/**
 * Filas de la rejilla, en el orden del día (ORDEN_FILAS): las franjas del perfil del usuario (o, si
 * no se conocen, Desayuno, Comida, Merienda y Cena) siempre; las demás solo si algún día de `dias`
 * tiene comidas de ese tipo (p. ej. de antes de cambiar las franjas).
 */
export function franjasVisibles(
  dias: readonly (DiaMenuResponse | null)[],
  fijas: readonly TipoComida[] = FRANJAS_FIJAS,
): TipoComida[] {
  const conComidas = new Set(dias.flatMap((d) => d?.comidas.map(franjaDe) ?? []));
  return ORDEN_FILAS.filter((t) => fijas.includes(t) || conComidas.has(t));
}

/** Comidas de una franja en un día, en el orden del servidor. */
export function comidasDeFranja(dia: DiaMenuResponse | null, franja: TipoComida): ComidaPlanificadaResponse[] {
  return dia?.comidas.filter((c) => franjaDe(c) === franja) ?? [];
}

/**
 * Fecha de inicio propuesta al generar: para un menú semanal, el lunes (`hoy` si es lunes, si no el
 * siguiente); para uno diario, `hoy`. Si se indica `preferida` y no es anterior a hoy, se usa esa
 * (en semanal, su lunes, si no queda en el pasado).
 */
export function fechaInicioSugerida(tipo: 'DIARIO' | 'SEMANAL', hoy: string, preferida?: string | null): string {
  const proximoLunes = lunesDeLaSemana(hoy) === hoy ? hoy : sumarDias(lunesDeLaSemana(hoy), 7);
  if (tipo === 'DIARIO') return preferida && preferida >= hoy ? preferida : hoy;
  if (preferida) {
    const lunes = lunesDeLaSemana(preferida);
    if (lunes >= hoy) return lunes;
  }
  return proximoLunes;
}

/** Diferencia con signo: "+20", "−10", "±0" (signo menos tipográfico). */
export function formatearDelta(valor: number, decimales = 0): string {
  const redondeado = Number(valor.toFixed(decimales));
  if (redondeado === 0) return '±0';
  return `${redondeado > 0 ? '+' : '−'}${formatearNumero(Math.abs(redondeado), decimales)}`;
}
