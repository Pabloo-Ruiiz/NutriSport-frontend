// ECharts por piezas (echarts/core): solo lo que usan los gráficos de la aplicación, en vez del
// paquete completo (~1,1 MB). Se importa bajo demanda desde cargarEcharts() (echarts-theme.ts).
//
// Si un gráfico nuevo usa otro tipo de serie o componente (pie, heatmap, dataZoom, visualMap…),
// hay que añadirlo aquí: si no, ECharts avisa en la consola y no lo pinta.
import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import { AriaComponent, GridComponent, LegendComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  // Series: kcal por día (barras), entrenos (puntos) y peso con su media (líneas).
  BarChart,
  ScatterChart,
  LineChart,
  // Componentes
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  // Descripción accesible generada por ECharts (aria.enabled en ns-chart).
  AriaComponent,
  // hideOverlap de las etiquetas del eje de fechas.
  LabelLayout,
  CanvasRenderer,
]);

export { echarts };
