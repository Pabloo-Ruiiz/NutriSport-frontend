// ECharts por piezas (echarts/core): solo lo que usan los gráficos de la aplicación, en vez del
// paquete completo (~1,1 MB). Se importa bajo demanda desde cargarEcharts() (echarts-theme.ts).
//
// Si un gráfico nuevo usa otro tipo de serie o componente (pie, heatmap, dataZoom, visualMap…),
// hay que añadirlo aquí: si no, ECharts avisa en la consola y no lo pinta.
import { BarChart, HeatmapChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import {
  AriaComponent,
  CalendarComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapPiecewiseComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  // Series: kcal por día (barras), entrenos (puntos) y peso con su media (líneas).
  BarChart,
  ScatterChart,
  LineChart,
  // Estadísticas: reparto de macros (anillo) y mapa de adherencia (heatmap en un calendario).
  PieChart,
  HeatmapChart,
  // Componentes
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  CalendarComponent,
  VisualMapPiecewiseComponent,
  // Descripción accesible generada por ECharts (aria.enabled en ns-chart).
  AriaComponent,
  // hideOverlap de las etiquetas del eje de fechas.
  LabelLayout,
  CanvasRenderer,
]);

export { echarts };
