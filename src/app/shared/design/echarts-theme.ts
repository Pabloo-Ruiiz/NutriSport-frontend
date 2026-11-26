import { TOKENS as t } from './tokens';

/** Nombre con el que se registra el tema y con el que lo pide ns-chart. */
export const TEMA_ECHARTS = 'nutrisport';

/** Tamaño de texto de todos los gráficos: nunca por debajo de 12 px (DESIGN.md §5.12). */
export const TEXTO_GRAFICO_PX = 12;

const texto = { fontFamily: t.fontBody, fontSize: TEXTO_GRAFICO_PX };

/**
 * Tema `nutrisport` de ECharts a partir de los tokens (DESIGN.md §5.12 y §9.6). ECharts pinta en
 * canvas y no lee variables CSS: por eso usa TOKENS.
 *
 * - Inter 12 px; ejes en text-tertiary; rejilla discontinua en border; sin bordes de área.
 * - Series con los colores de datos; líneas de 2,5 px con los puntos solo al pasar por encima.
 * - Tooltip oscuro (ink-950, texto blanco, radio md) con todas las series del punto.
 * - Leyenda arriba a la izquierda con marcadores circulares.
 *
 * La línea objetivo (discontinua ink-700 con etiqueta "Objetivo") y los degradados de las áreas
 * dependen de cada serie: usa lineaObjetivo() y areaDegradado().
 */
export const nutrisportTheme = {
  color: [t.kcal, t.proteina, t.hidratos, t.grasa, t.actividad, t.peso],
  backgroundColor: 'transparent',
  textStyle: { ...texto, color: t.textSecondary },
  title: {
    left: 0,
    textStyle: { ...texto, fontSize: 14, fontWeight: 600, color: t.ink950 },
    subtextStyle: { ...texto, color: t.textSecondary },
  },
  legend: {
    top: 0,
    left: 0,
    icon: 'circle',
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 16,
    textStyle: { ...texto, color: t.textSecondary },
  },
  grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true, borderWidth: 0 },
  categoryAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { ...texto, color: t.textTertiary },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { ...texto, color: t.textTertiary },
    splitLine: { lineStyle: { color: t.border, type: 'dashed' } },
  },
  timeAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { ...texto, color: t.textTertiary },
    splitLine: { show: false },
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: t.ink950,
    borderWidth: 0,
    borderRadius: t.radiusMd,
    padding: [8, 12],
    textStyle: { ...texto, color: t.white },
    axisPointer: { lineStyle: { color: t.border }, shadowStyle: { color: 'rgba(11, 18, 32, 0.04)' } },
  },
  line: {
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    showSymbol: false,
    lineStyle: { width: 2.5 },
    emphasis: { focus: 'series' },
  },
  bar: { itemStyle: { borderRadius: [6, 6, 0, 0] }, barMaxWidth: 32 },
  pie: { itemStyle: { borderWidth: 2, borderColor: t.white }, label: { ...texto, color: t.textSecondary } },
  heatmap: { label: { ...texto } },
  markLine: { label: { ...texto } },
};

/** markLine de la línea objetivo: discontinua ink-700 con la etiqueta "Objetivo". */
export function lineaObjetivo(valor: number, etiqueta = 'Objetivo') {
  return {
    silent: true,
    symbol: 'none',
    lineStyle: { color: t.ink700, type: 'dashed', width: 1.5 },
    label: { ...texto, color: t.ink700, formatter: etiqueta, position: 'insideEndTop' },
    data: [{ yAxis: valor }],
  };
}

/** areaStyle con degradado vertical del color al 12 % → 0 % (DESIGN.md §5.12). */
export function areaDegradado(colorHex: string) {
  return {
    color: {
      type: 'linear',
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: `${colorHex}1F` }, // 0x1F ≈ 12 %
        { offset: 1, color: `${colorHex}00` },
      ],
    },
  };
}

/**
 * Carga ECharts bajo demanda (provideEchartsCore) y registra el tema la primera vez. Así ECharts
 * solo entra en el bundle de las pantallas con gráficos, y solo con los módulos que se usan
 * (echarts-modulos.ts, sobre echarts/core).
 */
export function cargarEcharts() {
  return import('./echarts-modulos').then(({ echarts }) => {
    echarts.registerTheme(TEMA_ECHARTS, nutrisportTheme);
    return echarts;
  });
}
