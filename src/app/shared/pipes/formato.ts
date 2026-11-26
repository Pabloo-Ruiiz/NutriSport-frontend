/**
 * Formato es-ES de números y fechas (DESIGN.md §11): decimales con coma, miles con punto,
 * fechas "sáb. 21 nov", horas de 24 h y unidades separadas por un espacio.
 *
 * Los pipes usan estas funciones; también sirven para textos fuera de plantillas
 * (etiquetas de ECharts, aria-label…).
 */
import { desdeFechaApi } from '@core/util/fechas';

/** Lo que se muestra cuando no hay dato. */
export const SIN_DATO = '—';

/** Espacio que no se parte entre la cifra y la unidad ("2.450 kcal" nunca queda en dos líneas). */
export const ESPACIO_UNIDAD = ' ';

const LOCALE = 'es-ES';
const formatosNumero = new Map<number, Intl.NumberFormat>();

function formatoNumero(decimales: number): Intl.NumberFormat {
  let formato = formatosNumero.get(decimales);
  if (!formato) {
    const opciones: Omit<Intl.NumberFormatOptions, 'useGrouping'> & { useGrouping: 'always' } = {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
      // En español, Intl no agrupa los números de 4 cifras ("2450"); la guía pide "2.450".
      // 'always' es ES2023 (todos los navegadores actuales); la lib ES2022 de TypeScript solo admite boolean.
      useGrouping: 'always',
    };
    formato = new Intl.NumberFormat(LOCALE, opciones as unknown as Intl.NumberFormatOptions);
    formatosNumero.set(decimales, formato);
  }
  return formato;
}

function esNumero(valor: number | null | undefined): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

/** "72,4", "2.450". Sin dato → "—". */
export function formatearNumero(valor: number | null | undefined, decimales = 0): string {
  return esNumero(valor) ? formatoNumero(decimales).format(valor) : SIN_DATO;
}

/** "2.450 kcal" (siempre entero). Sin dato → "—". */
export function formatearKcal(valor: number | null | undefined): string {
  return esNumero(valor) ? `${formatearNumero(valor, 0)}${ESPACIO_UNIDAD}kcal` : SIN_DATO;
}

/** "112 g", "1,5 g". Sin dato → "—". */
export function formatearGramos(valor: number | null | undefined, decimales = 0): string {
  return esNumero(valor) ? `${formatearNumero(valor, decimales)}${ESPACIO_UNIDAD}g` : SIN_DATO;
}

// ---- Fechas

export type FormatoFecha = 'corta' | 'larga' | 'diaMes' | 'diaMesAnio' | 'hora';

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PATRON_HORA = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

const formatoCorta = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
const formatoLarga = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
const formatoDiaMes = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' });
const formatoDiaMesAnio = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
const formatoHora = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** "AAAA-MM-DD" → fecha local (mediodía); ISO con hora → instante. Inválida → null. */
function aDate(valor: string): Date | null {
  try {
    const fecha = PATRON_FECHA.test(valor) ? desdeFechaApi(valor) : new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  } catch {
    return null;
  }
}

/** "sáb. 21 nov": Intl da "sáb, 21 nov", así que se compone a partir de las partes. */
function fechaCorta(fecha: Date): string {
  const partes = formatoCorta.formatToParts(fecha);
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? '';
  return `${parte('weekday').replace(/\.$/, '')}. ${parte('day')} ${parte('month').replace(/\.$/, '')}`;
}

/**
 * Formatea una fecha de la API.
 * - "AAAA-MM-DD" se interpreta como fecha local (nunca se desplaza de día).
 * - Un ISO con hora ("2026-11-21T08:30:00+01:00") se muestra en la hora local.
 * - Con formato 'hora' también acepta una hora suelta de la API ("08:30:00" → "08:30").
 * Sin dato o con un valor no válido → "—".
 */
export function formatearFecha(valor: string | null | undefined, formato: FormatoFecha = 'corta'): string {
  if (!valor) {
    return SIN_DATO;
  }
  if (formato === 'hora') {
    const hora = PATRON_HORA.exec(valor);
    if (hora) {
      return `${hora[1]}:${hora[2]}`;
    }
  }
  const fecha = aDate(valor);
  if (!fecha) {
    return SIN_DATO;
  }
  switch (formato) {
    case 'corta':
      return fechaCorta(fecha);
    case 'larga':
      return formatoLarga.format(fecha);
    case 'diaMes':
      return formatoDiaMes.format(fecha).replace('.', '');
    case 'diaMesAnio':
      return formatoDiaMesAnio.format(fecha).replace('.', '');
    case 'hora':
      return formatoHora.format(fecha);
  }
}
