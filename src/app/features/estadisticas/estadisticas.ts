/**
 * Lógica pura de la pantalla de estadísticas (DESIGN.md §7.14): periodos y filtros de la URL,
 * periodo anterior para comparar y KPIs. Sin Angular, para probarla sin TestBed.
 */
import type { Agrupacion, EstadisticasResponse, SeriePesoResponse } from '@core/models';
import { aFechaApi, desdeFechaApi, diasEntre, sumarDias } from '@core/util/fechas';
import type { PeriodoComparativa } from '@core/services/seguimiento.service';
import { formatearFecha } from '@shared/pipes/formato';

export type PeriodoRapido = '7d' | '4s' | '3m';
export type Periodo = PeriodoRapido | 'personalizado';

export const PERIODOS: readonly { valor: Periodo; etiqueta: string }[] = [
  { valor: '7d', etiqueta: '7 días' },
  { valor: '4s', etiqueta: '4 semanas' },
  { valor: '3m', etiqueta: '3 meses' },
  { valor: 'personalizado', etiqueta: 'Personalizado' },
];

export const AGRUPACIONES: readonly { valor: Agrupacion; etiqueta: string }[] = [
  { valor: 'DIA', etiqueta: 'Día' },
  { valor: 'SEMANA', etiqueta: 'Semana' },
  { valor: 'MES', etiqueta: 'Mes' },
];

/** Días que puede abarcar un periodo personalizado (como GET /seguimiento/estadisticas). */
export const MAX_DIAS_PERIODO = 366;
/** Con menos días con comidas, la pantalla muestra el estado vacío. */
export const MIN_DIAS_REGISTRO = 2;

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Filtros de la pantalla, tal y como quedan en la URL (?periodo=&desde=&hasta=&agrupacion=&comparar=). */
export interface FiltrosEstadisticas {
  periodo: Periodo;
  desde: string;
  hasta: string;
  agrupacion: Agrupacion;
  comparar: boolean;
}

/** Query params tal y como llegan (con withComponentInputBinding, todos opcionales). */
export interface ParametrosEstadisticas {
  periodo?: string | null;
  desde?: string | null;
  hasta?: string | null;
  agrupacion?: string | null;
  comparar?: string | null;
}

/** Rango de un periodo rápido, terminando hoy: 7 días, 28 días o 3 meses naturales. */
export function rangoDePeriodo(periodo: PeriodoRapido, hoy: string): { desde: string; hasta: string } {
  switch (periodo) {
    case '7d':
      return { desde: sumarDias(hoy, -6), hasta: hoy };
    case '4s':
      return { desde: sumarDias(hoy, -27), hasta: hoy };
    case '3m': {
      const d = desdeFechaApi(hoy);
      d.setMonth(d.getMonth() - 3);
      return { desde: sumarDias(aFechaApi(d), 1), hasta: hoy };
    }
  }
}

/** Agrupación por defecto: por día hasta un mes, por semana hasta 4 meses y, si no, por mes. */
export function agrupacionPorDefecto(desde: string, hasta: string): Agrupacion {
  const dias = diasEntre(desde, hasta) + 1;
  return dias <= 31 ? 'DIA' : dias <= 124 ? 'SEMANA' : 'MES';
}

function fechaValida(f: string | null | undefined): f is string {
  if (!f || !PATRON_FECHA.test(f)) return false;
  try {
    return aFechaApi(desdeFechaApi(f)) === f;
  } catch {
    return false;
  }
}

/**
 * Motivo por el que un rango personalizado no vale (o null si vale): fechas no válidas, al revés,
 * futuras o de más de 366 días.
 */
export function errorRango(
  desde: string | null | undefined,
  hasta: string | null | undefined,
  hoy: string,
): string | null {
  if (!fechaValida(desde) || !fechaValida(hasta)) return 'Indica una fecha de inicio y una de fin válidas.';
  if (hasta < desde) return 'La fecha de fin no puede ser anterior a la de inicio.';
  if (hasta > hoy) return 'La fecha de fin no puede ser posterior a hoy.';
  if (diasEntre(desde, hasta) + 1 > MAX_DIAS_PERIODO)
    return `El periodo puede abarcar como mucho ${MAX_DIAS_PERIODO} días.`;
  return null;
}

/**
 * Filtros a partir de la URL. Un periodo desconocido, o uno personalizado con un rango que no vale,
 * vuelve a "4 semanas"; sin agrupación, la de por defecto del rango.
 */
export function leerFiltros(p: ParametrosEstadisticas, hoy: string): FiltrosEstadisticas {
  let periodo: Periodo = PERIODOS.some((o) => o.valor === p.periodo) ? (p.periodo as Periodo) : '4s';
  let rango: { desde: string; hasta: string };
  if (periodo === 'personalizado' && errorRango(p.desde, p.hasta, hoy) === null) {
    rango = { desde: p.desde!, hasta: p.hasta! };
  } else {
    if (periodo === 'personalizado') periodo = '4s';
    rango = rangoDePeriodo(periodo as PeriodoRapido, hoy);
  }
  const agrupacion = AGRUPACIONES.some((o) => o.valor === p.agrupacion)
    ? (p.agrupacion as Agrupacion)
    : agrupacionPorDefecto(rango.desde, rango.hasta);
  return { periodo, ...rango, agrupacion, comparar: p.comparar === '1' || p.comparar === 'true' };
}

/**
 * Query params de unos filtros: desde y hasta solo en el personalizado (los rápidos se recalculan
 * cada día) y comparar solo si está activo. null borra el parámetro de la URL.
 */
export function aParametros(f: FiltrosEstadisticas): Record<string, string | null> {
  const personalizado = f.periodo === 'personalizado';
  return {
    periodo: f.periodo,
    desde: personalizado ? f.desde : null,
    hasta: personalizado ? f.hasta : null,
    agrupacion: f.agrupacion,
    comparar: f.comparar ? '1' : null,
  };
}

/** El mismo número de días justo antes del rango. */
export function rangoAnterior(desde: string, hasta: string): { desde: string; hasta: string } {
  const dias = diasEntre(desde, hasta) + 1;
  return { desde: sumarDias(desde, -dias), hasta: sumarDias(desde, -1) };
}

/**
 * Cómo se obtiene el periodo anterior: 7 días y 4 semanas con GET /seguimiento/comparativa (la
 * semana o el mes naturales anteriores); 3 meses y el personalizado, con otra petición de
 * estadísticas del mismo número de días justo antes. Los KPIs comparan medias diarias, así que la
 * diferencia de duración no importa.
 */
export type Comparacion =
  | { tipo: 'comparativa'; periodo: PeriodoComparativa; texto: string }
  | { tipo: 'rango'; desde: string; hasta: string; texto: string };

export function comoComparar(f: FiltrosEstadisticas): Comparacion {
  switch (f.periodo) {
    case '7d':
      return { tipo: 'comparativa', periodo: 'SEMANA', texto: 'la semana anterior' };
    case '4s':
      return { tipo: 'comparativa', periodo: 'MES', texto: 'el mes anterior' };
    case '3m':
      return { tipo: 'rango', ...rangoAnterior(f.desde, f.hasta), texto: 'los 3 meses anteriores' };
    default: {
      const dias = diasEntre(f.desde, f.hasta) + 1;
      return { tipo: 'rango', ...rangoAnterior(f.desde, f.hasta), texto: `los ${dias} días anteriores` };
    }
  }
}

/** "26 oct – 21 nov 2026" (con el año en el inicio solo si cambia). */
export function textoRango(desde: string, hasta: string): string {
  const mismoAnio = desde.slice(0, 4) === hasta.slice(0, 4);
  return `${formatearFecha(desde, mismoAnio ? 'diaMes' : 'diaMesAnio')} – ${formatearFecha(hasta, 'diaMesAnio')}`;
}

// ---- KPIs

export interface KpisPeriodo {
  kcal: number;
  /** % de la media consumida sobre el objetivo medio; null sin objetivo. */
  kcalPctObjetivo: number | null;
  proteina: number;
  proteinaObjetivo: number | null;
  /** g de proteína por kg del último pesaje; null sin peso. */
  proteinaGKg: number | null;
  adherencia: number;
  diasEnObjetivo: number;
  diasConRegistro: number;
  pesoActual: number | null;
  variacionPeso: number | null;
  /** Variaciones frente al periodo anterior (undefined sin comparar o sin datos anteriores). */
  deltaKcalPct?: number;
  deltaProteinaPct?: number;
  deltaAdherenciaPts?: number;
}

/** Variación en % redondeada a entero; undefined si no hay base. */
export function variacionPct(actual: number, anterior: number | null | undefined): number | undefined {
  if (typeof anterior !== 'number' || anterior <= 0) return undefined;
  return Math.round(((actual - anterior) / anterior) * 100);
}

export function calcularKpis(
  est: EstadisticasResponse,
  anterior: EstadisticasResponse | null,
  peso: SeriePesoResponse | null,
): KpisPeriodo {
  const ultimo = peso?.puntos.at(-1)?.pesoKg ?? null;
  const objetivo = est.objetivoMedio as EstadisticasResponse['objetivoMedio'] | null;
  const conAnterior = anterior !== null && anterior.diasConRegistro > 0;
  const kpis: KpisPeriodo = {
    kcal: est.mediaDiaria.kcal,
    kcalPctObjetivo: objetivo?.kcal ? Math.round((est.mediaDiaria.kcal / objetivo.kcal) * 100) : null,
    proteina: est.mediaDiaria.proteina,
    proteinaObjetivo: objetivo?.proteina ?? null,
    proteinaGKg: ultimo ? est.mediaDiaria.proteina / ultimo : null,
    adherencia: est.porcentajeAdherencia,
    diasEnObjetivo: est.diasEnObjetivo,
    diasConRegistro: est.diasConRegistro,
    pesoActual: ultimo,
    variacionPeso: peso?.variacion ?? null,
  };
  if (conAnterior) {
    kpis.deltaKcalPct = variacionPct(est.mediaDiaria.kcal, anterior.mediaDiaria.kcal);
    kpis.deltaProteinaPct = variacionPct(est.mediaDiaria.proteina, anterior.mediaDiaria.proteina);
    kpis.deltaAdherenciaPts = Math.round(est.porcentajeAdherencia - anterior.porcentajeAdherencia);
  }
  return kpis;
}

/** Media diaria de kcal del periodo anterior para la línea discontinua (null sin datos). */
export function mediaAnteriorKcal(anterior: EstadisticasResponse | null): number | null {
  return anterior && anterior.diasConRegistro > 0 ? anterior.mediaDiaria.kcal : null;
}
