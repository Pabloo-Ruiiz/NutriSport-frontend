/**
 * Opciones de ECharts de la pantalla de estadísticas (DESIGN.md §7.14) y la tabla alternativa de cada
 * gráfico (DESIGN.md §5.12: cada gráfico tiene sus datos en texto para lectores de pantalla).
 *
 * Son funciones puras: reciben las respuestas de la API y devuelven EChartsOption o TablaGrafico, sin
 * Angular ni efectos. Los colores salen de TOKENS (ECharts pinta en canvas y no lee variables CSS).
 *
 * Recordatorio de la API (PuntoSerieResponse): `consumido` es la media diaria de los días con registro
 * del periodo (en DIA, lo del día) y es cero si no hay ninguno; `objetivo` puede llegar nulo si ningún
 * día del periodo tiene objetivo guardado.
 */
import type { EChartsOption } from 'echarts';

import type {
  Agrupacion,
  EstadisticasResponse,
  Nutrientes,
  PuntoSerieResponse,
  SeriePesoResponse,
  TipoComida,
} from '@core/models';
import { ETIQUETAS_TIPO_COMIDA, ORDEN_TIPOS_COMIDA } from '@core/models/etiquetas';
import { desdeFechaApi, rangoDias } from '@core/util/fechas';
import { TOKENS } from '@shared/design/tokens';
import { formatearFecha, formatearNumero } from '@shared/pipes/formato';

// ---- Tabla alternativa

/**
 * Datos de un gráfico en forma de tabla: `columnas` son las cabeceras (la primera, la de las filas) y
 * cada fila empieza por su cabecera (th scope="row") seguida de las celdas ya formateadas.
 */
export interface TablaGrafico {
  titulo: string;
  columnas: string[];
  filas: string[][];
}

// ---- Etiquetas comunes

const SIN_DATO = '—';

/** Macronutrientes en el orden de la app, con su color de datos (DESIGN.md §2.4). */
export const MACROS = [
  { clave: 'proteina', nombre: 'Proteína', color: TOKENS.proteina },
  { clave: 'carbohidratos', nombre: 'Carbohidratos', color: TOKENS.hidratos },
  { clave: 'grasa', nombre: 'Grasa', color: TOKENS.grasa },
] as const satisfies readonly { clave: keyof Nutrientes; nombre: string; color: string }[];

const MES_ANIO = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_SEMANA_CORTOS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // ECharts empieza por el domingo

const kcal = (v: number | null | undefined) => (typeof v === 'number' ? `${formatearNumero(v)} kcal` : SIN_DATO);
const gramos = (v: number | null | undefined) => (typeof v === 'number' ? `${formatearNumero(v)} g` : SIN_DATO);
const kg = (v: number | null | undefined) => (typeof v === 'number' ? `${formatearNumero(v, 1)} kg` : SIN_DATO);
const pct = (v: number | null | undefined) => (typeof v === 'number' ? `${formatearNumero(v)} %` : SIN_DATO);

/** Redondeo para pintar: los datos de la API llegan con decimales. */
function redondear(v: number | null | undefined, decimales = 0): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const f = 10 ** decimales;
  return Math.round(v * f) / f;
}

/**
 * Etiqueta corta de un periodo de la serie: "24 nov" (DIA), "Sem. 24 nov" (SEMANA, por su primer día
 * dentro del rango) o "Noviembre 2026" (MES).
 */
export function etiquetaPeriodo(punto: Pick<PuntoSerieResponse, 'desde'>, agrupacion: Agrupacion): string {
  switch (agrupacion) {
    case 'SEMANA':
      return `Sem. ${formatearFecha(punto.desde, 'diaMes')}`;
    case 'MES': {
      const texto = MES_ANIO.format(desdeFechaApi(punto.desde)).replace(' de ', ' ');
      return texto.charAt(0).toUpperCase() + texto.slice(1);
    }
    default:
      return formatearFecha(punto.desde, 'diaMes');
  }
}

/** El periodo no tiene ningún día con comidas: no hay consumo que pintar. */
function sinRegistro(punto: PuntoSerieResponse): boolean {
  return punto.diasConRegistro === 0;
}

// ---- Energía consumida frente al objetivo

export const SERIE_MEDIA_ANTERIOR = 'Media del periodo anterior';

/**
 * Barras de kcal consumidas (media diaria de cada periodo; sin barra si no hay registros) frente a la
 * línea del objetivo. Con `mediaAnterior` (kcal medias diarias del periodo anterior), una línea
 * horizontal discontinua gris con ese valor.
 */
export function opcionesEnergia(est: EstadisticasResponse, mediaAnterior?: number | null): EChartsOption {
  const etiquetas = est.serie.map((p) => etiquetaPeriodo(p, est.agrupacion));
  const conAnterior = typeof mediaAnterior === 'number';
  const series: NonNullable<EChartsOption['series']> = [
    {
      name: 'Consumido',
      type: 'bar',
      barMaxWidth: 32,
      itemStyle: { color: TOKENS.kcal },
      data: est.serie.map((p) => (sinRegistro(p) ? null : redondear(p.consumido.kcal))),
    },
    {
      name: 'Objetivo',
      type: 'line',
      symbol: 'none',
      connectNulls: false,
      itemStyle: { color: TOKENS.linea },
      lineStyle: { width: 2, color: TOKENS.linea },
      data: est.serie.map((p) => redondear(p.objetivo?.kcal)),
    },
  ];
  if (conAnterior) {
    series.push({
      name: SERIE_MEDIA_ANTERIOR,
      type: 'line',
      symbol: 'none',
      silent: true,
      itemStyle: { color: TOKENS.textTertiary },
      lineStyle: { type: 'dashed', width: 2, color: TOKENS.textTertiary },
      data: est.serie.map(() => redondear(mediaAnterior)),
    });
  }
  return {
    legend: { data: ['Consumido', 'Objetivo', ...(conAnterior ? [SERIE_MEDIA_ANTERIOR] : [])] },
    grid: { top: 40, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (v: unknown) => kcal(v as number | null),
    },
    xAxis: { type: 'category', data: etiquetas, axisLabel: { hideOverlap: true } },
    yAxis: { type: 'value', splitNumber: 4, axisLabel: { formatter: (v: number) => formatearNumero(v) } },
    series,
  };
}

/** Tabla de la energía: periodo, consumido (media diaria), objetivo y, si se compara, la media anterior. */
export function tablaEnergia(est: EstadisticasResponse, mediaAnterior?: number | null): TablaGrafico {
  const conAnterior = typeof mediaAnterior === 'number';
  return {
    titulo: 'Energía consumida frente al objetivo (media diaria de cada periodo)',
    columnas: ['Periodo', 'Consumido', 'Objetivo', ...(conAnterior ? [SERIE_MEDIA_ANTERIOR] : [])],
    filas: est.serie.map((p) => [
      etiquetaPeriodo(p, est.agrupacion),
      sinRegistro(p) ? 'Sin registros' : kcal(p.consumido.kcal),
      kcal(p.objetivo?.kcal),
      ...(conAnterior ? [kcal(mediaAnterior)] : []),
    ]),
  };
}

// ---- Macros apiladas por periodo

/** Barras apiladas de gramos de proteína, carbohidratos y grasa (media diaria de cada periodo). */
export function opcionesMacros(est: EstadisticasResponse): EChartsOption {
  return {
    legend: { data: MACROS.map((m) => m.nombre) },
    grid: { top: 40, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (v: unknown) => gramos(v as number | null),
    },
    xAxis: {
      type: 'category',
      data: est.serie.map((p) => etiquetaPeriodo(p, est.agrupacion)),
      axisLabel: { hideOverlap: true },
    },
    yAxis: { type: 'value', splitNumber: 4, axisLabel: { formatter: (v: number) => `${formatearNumero(v)} g` } },
    series: MACROS.map((m) => ({
      name: m.nombre,
      type: 'bar' as const,
      stack: 'macros',
      barMaxWidth: 32,
      itemStyle: { color: m.color },
      data: est.serie.map((p) => (sinRegistro(p) ? null : redondear(p.consumido[m.clave]))),
    })),
  };
}

/** Tabla de las macros: periodo y gramos de cada macro. */
export function tablaMacros(est: EstadisticasResponse): TablaGrafico {
  return {
    titulo: 'Macronutrientes por periodo (media diaria, en gramos)',
    columnas: ['Periodo', ...MACROS.map((m) => m.nombre)],
    filas: est.serie.map((p) => [
      etiquetaPeriodo(p, est.agrupacion),
      ...MACROS.map((m) => (sinRegistro(p) ? 'Sin registros' : gramos(p.consumido[m.clave]))),
    ]),
  };
}

// ---- Reparto medio de macros (anillo)

/** Porcentaje de cada macro en `repartoMacrosPct` (claves proteina, carbohidratos, grasa; suma 100). */
function repartoOrdenado(reparto: Record<string, number>): { nombre: string; color: string; valor: number }[] {
  return MACROS.map((m) => ({ nombre: m.nombre, color: m.color, valor: reparto[m.clave] ?? 0 }));
}

/** Anillo con el % de la energía media que aporta cada macro. */
export function opcionesReparto(est: EstadisticasResponse): EChartsOption {
  const datos = repartoOrdenado(est.repartoMacrosPct);
  return {
    legend: { bottom: 0, data: datos.map((d) => d.nombre) },
    tooltip: {
      trigger: 'item',
      formatter: (p: unknown) => `${(p as { name: string }).name}: ${pct((p as { value: number }).value)}`,
    },
    series: [
      {
        name: 'Reparto de macros',
        type: 'pie',
        radius: ['55%', '80%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        label: { show: true, formatter: (p: { value?: unknown }) => pct(p.value as number) },
        data: datos.map((d) => ({ name: d.nombre, value: d.valor, itemStyle: { color: d.color } })),
      },
    ],
  };
}

/** Tabla del reparto: macro y % de la energía media. */
export function tablaReparto(est: EstadisticasResponse): TablaGrafico {
  return {
    titulo: 'Reparto de la energía media entre macronutrientes',
    columnas: ['Macronutriente', 'Porcentaje de la energía'],
    filas: repartoOrdenado(est.repartoMacrosPct).map((d) => [d.nombre, pct(d.valor)]),
  };
}

// ---- Peso con media móvil

/** Pesajes (puntos grises) y su media móvil de 7 días (línea del color del peso). */
export function opcionesPeso(serie: SeriePesoResponse): EChartsOption {
  return {
    legend: { data: ['Pesaje', 'Media móvil 7 días'] },
    grid: { top: 40, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => kg(v as number | null) },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: serie.puntos.map((p) => formatearFecha(p.fecha, 'diaMes')),
      axisLabel: { hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      scale: true,
      // ±2 kg alrededor de los datos, para que con pocos pesajes la línea no quede plana.
      min: (v: { min: number }) => Math.floor(v.min - 2),
      max: (v: { max: number }) => Math.ceil(v.max + 2),
      splitNumber: 4,
      axisLabel: { formatter: (v: number) => formatearNumero(v, 1) },
    },
    series: [
      {
        name: 'Pesaje',
        type: 'line',
        showSymbol: true,
        symbolSize: 6,
        lineStyle: { width: 0 },
        itemStyle: { color: TOKENS.textTertiary },
        data: serie.puntos.map((p) => redondear(p.pesoKg, 1)),
      },
      {
        name: 'Media móvil 7 días',
        type: 'line',
        symbol: 'none',
        connectNulls: true,
        itemStyle: { color: TOKENS.peso },
        lineStyle: { width: 2, color: TOKENS.peso },
        data: serie.puntos.map((p) => redondear(p.mediaMovil7, 1)),
      },
    ],
  };
}

/** Tabla del peso: fecha, pesaje y media móvil. */
export function tablaPeso(serie: SeriePesoResponse): TablaGrafico {
  return {
    titulo: 'Evolución del peso',
    columnas: ['Fecha', 'Peso', 'Media móvil 7 días'],
    filas: serie.puntos.map((p) => [formatearFecha(p.fecha, 'diaMesAnio'), kg(p.pesoKg), kg(p.mediaMovil7)]),
  };
}

// ---- Mapa de adherencia (calendario)

export type EstadoAdherencia = 'EN_OBJETIVO' | 'FUERA' | 'SIN_REGISTRO';

export const ETIQUETAS_ADHERENCIA: Record<EstadoAdherencia, string> = {
  EN_OBJETIVO: 'En objetivo',
  FUERA: 'Fuera del objetivo',
  SIN_REGISTRO: 'Sin registro',
};

/** Valor numérico de cada estado para el visualMap del heatmap. */
const VALOR_ADHERENCIA: Record<EstadoAdherencia, number> = { EN_OBJETIVO: 2, FUERA: 1, SIN_REGISTRO: 0 };
const COLOR_ADHERENCIA: Record<EstadoAdherencia, string> = {
  EN_OBJETIVO: TOKENS.kcal,
  FUERA: TOKENS.warning,
  SIN_REGISTRO: TOKENS.border,
};
const ESTADOS: readonly EstadoAdherencia[] = ['EN_OBJETIVO', 'FUERA', 'SIN_REGISTRO'];

/**
 * Estado de cada día del rango (de `desde` a `hasta`): en objetivo (energía en ±10 %), fuera o sin
 * registro. Necesita la serie por DIA; un día que no venga en la serie cuenta como sin registro.
 * @throws RangeError si la agrupación no es DIA (un punto semanal o mensual no dice qué días cumplen).
 */
export function diasAdherencia(est: EstadisticasResponse): { fecha: string; estado: EstadoAdherencia }[] {
  if (est.agrupacion !== 'DIA') {
    throw new RangeError(`El mapa de adherencia necesita la serie por DIA (llegó por ${est.agrupacion}).`);
  }
  const porFecha = new Map(est.serie.map((p) => [p.desde, p]));
  return rangoDias(est.desde, est.hasta).map((fecha) => {
    const p = porFecha.get(fecha);
    const estado: EstadoAdherencia =
      !p || p.diasConRegistro === 0 ? 'SIN_REGISTRO' : p.diasEnObjetivo > 0 ? 'EN_OBJETIVO' : 'FUERA';
    return { fecha, estado };
  });
}

/** Tamaño de cada celda del calendario (px); el componente da scroll horizontal en móvil. */
export const CELDA_ADHERENCIA_PX = 16;

/** Heatmap de calendario (semanas en columnas, de lunes a domingo) con los tres estados de cada día. */
export function opcionesAdherencia(est: EstadisticasResponse): EChartsOption {
  const dias = diasAdherencia(est);
  return {
    tooltip: {
      formatter: (p: unknown) => {
        const [fecha, valor] = (p as { value: [string, number] }).value;
        const estado = ESTADOS.find((e) => VALOR_ADHERENCIA[e] === valor) ?? 'SIN_REGISTRO';
        return `<strong>${formatearFecha(fecha, 'larga')}</strong><br>${ETIQUETAS_ADHERENCIA[estado]}`;
      },
    },
    visualMap: {
      type: 'piecewise',
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      dimension: 1,
      pieces: ESTADOS.map((e) => ({
        value: VALOR_ADHERENCIA[e],
        label: ETIQUETAS_ADHERENCIA[e],
        color: COLOR_ADHERENCIA[e],
      })),
    },
    calendar: {
      range: [est.desde, est.hasta],
      orient: 'horizontal',
      top: 28,
      left: 32,
      right: 8,
      cellSize: [CELDA_ADHERENCIA_PX, CELDA_ADHERENCIA_PX],
      splitLine: { show: false },
      itemStyle: { color: 'transparent', borderColor: TOKENS.fondo, borderWidth: 2 },
      dayLabel: { firstDay: 1, nameMap: DIAS_SEMANA_CORTOS, color: TOKENS.textTertiary, fontSize: 12 },
      monthLabel: { nameMap: MESES_CORTOS, color: TOKENS.textTertiary, fontSize: 12 },
      yearLabel: { show: false },
    },
    series: [
      {
        name: 'Adherencia',
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: dias.map((d) => [d.fecha, VALOR_ADHERENCIA[d.estado]]),
      },
    ],
  };
}

/** Tabla de la adherencia: cada día con su estado. */
export function tablaAdherencia(est: EstadisticasResponse): TablaGrafico {
  return {
    titulo: 'Adherencia diaria al objetivo de energía (±10 %)',
    columnas: ['Día', 'Estado'],
    filas: diasAdherencia(est).map((d) => [formatearFecha(d.fecha, 'larga'), ETIQUETAS_ADHERENCIA[d.estado]]),
  };
}

// ---- Kcal por tipo de comida

/** Tipos de comida con kcal (> 0) en el orden del día, con su etiqueta; los desconocidos, al final. */
function comidasOrdenadas(porTipo: Record<string, number>): { etiqueta: string; kcal: number }[] {
  const conocidos = new Set<string>(ORDEN_TIPOS_COMIDA);
  const claves = [...ORDEN_TIPOS_COMIDA, ...Object.keys(porTipo).filter((k) => !conocidos.has(k))];
  return claves
    .filter((k) => (porTipo[k] ?? 0) > 0)
    .map((k) => ({ etiqueta: ETIQUETAS_TIPO_COMIDA[k as TipoComida] ?? k, kcal: porTipo[k] }));
}

/** Barras horizontales con las kcal medias diarias de cada tipo de comida, de arriba abajo en el orden del día. */
export function opcionesComidas(est: EstadisticasResponse): EChartsOption {
  const datos = comidasOrdenadas(est.kcalPorTipoComida);
  return {
    grid: { top: 8, bottom: 8, left: 8, right: 72, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (v: unknown) => kcal(v as number | null),
    },
    xAxis: { type: 'value', splitNumber: 3, axisLabel: { formatter: (v: number) => formatearNumero(v) } },
    yAxis: { type: 'category', inverse: true, data: datos.map((d) => d.etiqueta), axisTick: { show: false } },
    series: [
      {
        name: 'Kcal medias',
        type: 'bar',
        barMaxWidth: 20,
        itemStyle: { color: TOKENS.kcal },
        label: {
          show: true,
          position: 'right',
          color: TOKENS.textSecondary,
          formatter: (p: { value?: unknown }) => kcal(p.value as number),
        },
        data: datos.map((d) => redondear(d.kcal)),
      },
    ],
  };
}

/** Tabla del reparto por comidas: tipo de comida y kcal medias diarias. */
export function tablaComidas(est: EstadisticasResponse): TablaGrafico {
  return {
    titulo: 'Energía media diaria por tipo de comida',
    columnas: ['Tipo de comida', 'Kcal medias'],
    filas: comidasOrdenadas(est.kcalPorTipoComida).map((d) => [d.etiqueta, kcal(d.kcal)]),
  };
}
