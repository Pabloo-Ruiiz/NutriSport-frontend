import type { RegistroComidaResponse, ResumenDiarioResponse, TipoComida } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA } from '@core/models/etiquetas';

/** "Buenos días" hasta las 13:59, "Buenas tardes" hasta las 20:59, "Buenas noches" el resto (y de madrugada). */
export function saludo(hora: number): string {
  if (hora >= 6 && hora < 14) return 'Buenos días';
  if (hora >= 14 && hora < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Primer nombre para el saludo ("Álex" de "Álex Romero"). */
export function primerNombre(nombre: string | null | undefined): string {
  return nombre?.trim().split(/\s+/)[0] ?? '';
}

/** Hora orientativa de cada franja: ordena las franjas del día (y las que aún no tienen comidas). */
const HORA_FRANJA: Record<TipoComida, string> = {
  DESAYUNO: '08:00',
  MEDIA_MANANA: '11:00',
  COMIDA: '14:00',
  PRE_ENTRENO: '17:00',
  MERIENDA: '17:30',
  POST_ENTRENO: '19:30',
  CENA: '21:00',
  OTRO: '23:59',
};

/** Franjas que se ven siempre (con "Añadir" si están vacías); el resto, solo si tienen comidas. */
export const FRANJAS_FIJAS: readonly TipoComida[] = ['DESAYUNO', 'COMIDA', 'MERIENDA', 'CENA'];

export interface Franja {
  tipo: TipoComida;
  etiqueta: string;
  /** "08:10": la de su primera comida; null si está vacía. */
  hora: string | null;
  comidas: RegistroComidaResponse[];
}

const horaDe = (c: RegistroComidaResponse) => c.hora?.slice(0, 5) ?? HORA_FRANJA[c.tipoComida ?? 'OTRO'];

/**
 * Timeline del día: las franjas fijas más las que tienen comidas (o, en `tiposExtra`, comidas del
 * plan pendientes), en el orden del día (por la hora de su primera comida o, vacías, por su hora
 * orientativa). Cada franja con sus comidas por hora.
 */
export function franjasDelDia(
  comidas: readonly RegistroComidaResponse[],
  tiposExtra: readonly TipoComida[] = [],
): Franja[] {
  const porTipo = new Map<TipoComida, RegistroComidaResponse[]>();
  for (const c of comidas) {
    const tipo = c.tipoComida ?? 'OTRO';
    porTipo.set(tipo, [...(porTipo.get(tipo) ?? []), c]);
  }
  const tipos = new Set<TipoComida>([...FRANJAS_FIJAS, ...porTipo.keys(), ...tiposExtra]);
  return [...tipos]
    .map((tipo) => {
      const lista = [...(porTipo.get(tipo) ?? [])].sort((a, b) => horaDe(a).localeCompare(horaDe(b)));
      return {
        tipo,
        etiqueta: ETIQUETAS_TIPO_COMIDA[tipo],
        hora: lista.length ? horaDe(lista[0]) : null,
        comidas: lista,
      };
    })
    .sort((a, b) => (a.hora ?? HORA_FRANJA[a.tipo]).localeCompare(b.hora ?? HORA_FRANJA[b.tipo]));
}

export type Macro = 'proteina' | 'carbohidratos' | 'grasa';

export interface FuenteMacro {
  id: string;
  /** "Comida", "Desayuno"… */
  etiqueta: string;
  gramos: number;
}

/** Las `n` comidas que más aportan de un macro (las que aportan algo), de más a menos. */
export function comidasQueMasAportan(comidas: readonly RegistroComidaResponse[], macro: Macro, n = 2): FuenteMacro[] {
  return comidas
    .filter((c) => c.totales[macro] > 0)
    .sort((a, b) => b.totales[macro] - a.totales[macro])
    .slice(0, n)
    .map((c) => ({
      id: c.id,
      etiqueta: c.tipoComida ? ETIQUETAS_TIPO_COMIDA[c.tipoComida] : 'Comida',
      gramos: c.totales[macro],
    }));
}

export interface DiaSemanaKcal {
  fecha: string;
  consumido: number;
  objetivo: number | null;
  /** Algún entrenamiento planificado o realizado ese día. */
  entreno: boolean;
  conComidas: boolean;
}

/** Datos de un día para el gráfico semanal a partir de su resumen (null si no se pudo cargar). */
export function diaDesdeResumen(fecha: string, r: ResumenDiarioResponse | null | undefined): DiaSemanaKcal {
  return {
    fecha,
    consumido: r?.consumido.kcal ?? 0,
    objetivo: r?.objetivo.kcal ?? null,
    entreno: !!r?.entrenamientos.some((e) => e.estado !== 'OMITIDO'),
    conComidas: !!r?.comidas.length,
  };
}
