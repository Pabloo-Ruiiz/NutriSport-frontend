import type { EntrenamientoResponse, Intensidad } from '@core/models';
import { ETIQUETAS_INTENSIDAD } from '@core/models/etiquetas';
import { aFechaApi, desdeFechaApi, rangoDias, sumarDias } from '@core/util/fechas';
import { formatearNumero } from '@shared/pipes/formato';

/** Día local ("AAAA-MM-DD") del instante de un ISO con zona (la hora local del navegador). */
export function fechaLocalDeIso(iso: string): string {
  return aFechaApi(new Date(iso));
}

/** Domingo de la semana que empieza en `lunes`. */
export function domingoDe(lunes: string): string {
  return sumarDias(lunes, 6);
}

const MES = new Intl.DateTimeFormat('es-ES', { month: 'short' });
const mes = (f: string) => MES.format(desdeFechaApi(f)).replace('.', '');
const dia = (f: string) => Number(f.slice(8, 10));

/** "23–29 nov", "30 nov – 6 dic" y, si cambia el año, "29 dic 2025 – 4 ene 2026". */
export function etiquetaSemana(lunes: string): string {
  const domingo = domingoDe(lunes);
  if (lunes.slice(0, 4) !== domingo.slice(0, 4)) {
    return `${dia(lunes)} ${mes(lunes)} ${lunes.slice(0, 4)} – ${dia(domingo)} ${mes(domingo)} ${domingo.slice(0, 4)}`;
  }
  if (lunes.slice(5, 7) !== domingo.slice(5, 7)) return `${dia(lunes)} ${mes(lunes)} – ${dia(domingo)} ${mes(domingo)}`;
  return `${dia(lunes)}–${dia(domingo)} ${mes(domingo)}`;
}

/** true si el entrenamiento ya ha empezado (se puede marcar como realizado). */
export function haLlegado(e: EntrenamientoResponse, ahora: Date = new Date()): boolean {
  return new Date(e.fechaHora).getTime() <= ahora.getTime();
}

export interface KpisSemana {
  sesiones: number;
  minutos: number;
  kcal: number;
  /** Suma de duración × RPE (sesiones realizadas con RPE). */
  carga: number;
  /** Realizadas sin RPE: no cuentan en la carga. */
  sinRpe: number;
}

/** KPIs de los entrenamientos REALIZADOS. */
export function calcularKpis(lista: readonly EntrenamientoResponse[]): KpisSemana {
  const realizados = lista.filter((e) => e.estado === 'REALIZADO');
  return {
    sesiones: realizados.length,
    minutos: realizados.reduce((s, e) => s + e.duracionMin, 0),
    kcal: realizados.reduce((s, e) => s + e.kcalEstimadas, 0),
    carga: realizados.reduce((s, e) => s + (e.rpe === null ? 0 : e.duracionMin * e.rpe), 0),
    sinRpe: realizados.filter((e) => e.rpe === null).length,
  };
}

export interface SegmentoCarga {
  id: string;
  minutos: number;
  intensidad: Intensidad;
  planificado: boolean;
}

export interface DiaCarga {
  fecha: string;
  /** "L", "M", "X"… */
  inicial: string;
  minutos: number;
  segmentos: SegmentoCarga[];
  /** Texto para lectores de pantalla: "Lunes 23: 90 min. 60 min de intensidad alta, 30 min…". */
  descripcion: string;
}

const INICIALES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIA_SEMANA = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric' });
const ORDEN_INTENSIDAD: Record<Intensidad, number> = { ALTA: 0, MEDIA: 1, BAJA: 2 };

/**
 * Minutos por día de la semana (lunes a domingo) de los realizados y planificados (los omitidos no
 * cuentan), con un segmento por entrenamiento: de abajo arriba, alta, media y baja.
 */
export function cargaPorDia(lista: readonly EntrenamientoResponse[], lunes: string): DiaCarga[] {
  return rangoDias(lunes, domingoDe(lunes)).map((fecha, i) => {
    const segmentos = lista
      .filter((e) => e.estado !== 'OMITIDO' && fechaLocalDeIso(e.fechaHora) === fecha)
      .map((e) => ({
        id: e.id,
        minutos: e.duracionMin,
        intensidad: e.intensidad,
        planificado: e.estado === 'PLANIFICADO',
      }))
      .sort((a, b) => ORDEN_INTENSIDAD[a.intensidad] - ORDEN_INTENSIDAD[b.intensidad]);
    const minutos = segmentos.reduce((s, x) => s + x.minutos, 0);
    const nombre = DIA_SEMANA.format(desdeFechaApi(fecha));
    const detalle = segmentos
      .map(
        (x) =>
          `${formatearNumero(x.minutos)} min de intensidad ${ETIQUETAS_INTENSIDAD[x.intensidad].toLowerCase()}${x.planificado ? ' (planificado)' : ''}`,
      )
      .join(', ');
    return {
      fecha,
      inicial: INICIALES[i],
      minutos,
      segmentos,
      descripcion: segmentos.length
        ? `${nombre}: ${formatearNumero(minutos)} min. ${detalle}.`
        : `${nombre}: sin entrenamientos.`,
    };
  });
}

const FECHA_HORA = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** "lun 23 nov, 18:30" en la hora local. */
export function formatearFechaHora(iso: string): string {
  return FECHA_HORA.format(new Date(iso)).replace(/\./g, '');
}
