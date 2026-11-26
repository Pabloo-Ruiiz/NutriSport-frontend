import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EChartsOption } from 'echarts';

import { desdeFechaApi } from '@core/util/fechas';
import { TOKENS } from '@shared/design/tokens';
import { formatearNumero } from '@shared/pipes/formato';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsChartComponent } from '@shared/ui/data/chart.component';
import type { DiaSemanaKcal } from '../dashboard';

const DIA_CORTO = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
const DIA_LARGO = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

/** "Lun", "Mar"… y "Hoy". */
export function etiquetaDia(fecha: string, hoy: string): string {
  if (fecha === hoy) return 'Hoy';
  const corto = DIA_CORTO.format(desdeFechaApi(fecha)).replace('.', '');
  return corto.charAt(0).toUpperCase() + corto.slice(1);
}

/**
 * Opciones del gráfico semanal: barras de kcal consumidas (sin barra en los días sin comidas), una
 * marca horizontal del objetivo de cada día y un punto bajo el eje en los días de entreno. La
 * leyenda incluye "Día de entreno" (serie sin datos) para que el punto tenga su texto.
 */
export function opcionesSemana(dias: readonly DiaSemanaKcal[], hoy: string): EChartsOption {
  const etiquetas = dias.map((d) => etiquetaDia(d.fecha, hoy));
  return {
    legend: {
      data: [
        { name: 'Consumido', icon: 'circle' },
        { name: 'Objetivo', icon: 'rect' },
        { name: 'Día de entreno', icon: 'circle' },
      ],
    },
    grid: { top: 40, bottom: 8 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (p: unknown) => {
        const i = (p as { dataIndex: number }[])[0]?.dataIndex ?? 0;
        const d = dias[i];
        const lineas = [
          `<strong>${DIA_LARGO.format(desdeFechaApi(d.fecha))}</strong>`,
          `Consumido: ${formatearNumero(d.consumido)} kcal`,
          `Objetivo: ${d.objetivo === null ? '—' : formatearNumero(d.objetivo) + ' kcal'}`,
        ];
        if (d.entreno) lineas.push('Día de entreno');
        return lineas.join('<br>');
      },
    },
    xAxis: {
      type: 'category',
      data: etiquetas,
      axisLabel: {
        interval: 0,
        formatter: (valor: string, i: number) =>
          `{${valor === 'Hoy' ? 'hoy' : 'dia'}|${valor}}\n{${dias[i]?.entreno ? 'entreno' : 'sin'}|●}`,
        rich: {
          dia: { fontSize: 12, color: TOKENS.textTertiary, lineHeight: 18 },
          hoy: { fontSize: 12, color: TOKENS.ink950, fontWeight: 600, lineHeight: 18 },
          entreno: { fontSize: 12, color: TOKENS.actividad, lineHeight: 14 },
          sin: { fontSize: 12, color: 'transparent', lineHeight: 14 },
        },
      },
    },
    yAxis: { type: 'value', splitNumber: 3 },
    series: [
      {
        name: 'Consumido',
        type: 'bar',
        barWidth: '45%',
        itemStyle: { color: TOKENS.kcal },
        data: dias.map((d) => (d.conComidas ? Math.round(d.consumido) : null)),
      },
      {
        name: 'Objetivo',
        type: 'scatter',
        symbol: 'rect',
        symbolSize: [34, 3],
        itemStyle: { color: TOKENS.ink700 },
        z: 3,
        data: dias.map((d) => (d.objetivo === null ? null : Math.round(d.objetivo))),
      },
      // Solo para la leyenda: el punto de entreno se pinta en el eje.
      { name: 'Día de entreno', type: 'scatter', itemStyle: { color: TOKENS.actividad }, data: [] },
    ],
  };
}

/**
 * Energía de la semana (DESIGN.md §7.4): kcal consumidas por día frente al objetivo de cada día
 * (que cambia con los entrenamientos), con los días de entreno señalados en el eje. Para lectores
 * de pantalla, un resumen en el aria-label y la tabla con los datos.
 */
@Component({
  selector: 'app-grafico-semana',
  imports: [NS_CARD, NsChartComponent],
  template: `
    <ns-card>
      <h3 nsCardTitulo>Energía esta semana</h3>
      <p nsCardSubtitulo>
        Consumido frente al objetivo diario{{ media() !== null ? ' · media ' + n(media()) + ' kcal' : '' }}
      </p>
      <ns-chart [options]="opciones()" [ariaLabel]="resumen()" [altura]="260" [loading]="!dias()">
        <table>
          <caption>
            Energía por día de la semana
          </caption>
          <thead>
            <tr>
              <th scope="col">Día</th>
              <th scope="col">Consumido</th>
              <th scope="col">Objetivo</th>
              <th scope="col">Entreno</th>
            </tr>
          </thead>
          <tbody>
            @for (d of dias() ?? []; track d.fecha) {
              <tr>
                <th scope="row">{{ largo(d.fecha) }}</th>
                <td>{{ d.conComidas ? n(d.consumido) + ' kcal' : 'Sin comidas' }}</td>
                <td>{{ d.objetivo === null ? '—' : n(d.objetivo) + ' kcal' }}</td>
                <td>{{ d.entreno ? 'Sí' : 'No' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </ns-chart>
    </ns-card>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficoSemanaComponent {
  /** Los 7 días (lunes a domingo); null mientras cargan. */
  readonly dias = input.required<DiaSemanaKcal[] | null>();
  readonly hoy = input.required<string>();

  protected readonly n = formatearNumero;
  protected readonly opciones = computed(() => opcionesSemana(this.dias() ?? [], this.hoy()));
  /** Media de los días con comidas. */
  protected readonly media = computed(() => {
    const con = (this.dias() ?? []).filter((d) => d.conComidas);
    return con.length ? con.reduce((s, d) => s + d.consumido, 0) / con.length : null;
  });
  protected readonly resumen = computed(() => {
    const dias = this.dias();
    if (!dias) return 'Cargando la energía de la semana';
    const con = dias.filter((d) => d.conComidas).length;
    const entreno = dias.filter((d) => d.entreno).length;
    const media = this.media();
    return (
      `Energía esta semana: ${con} de 7 días con comidas` +
      (media !== null ? `, media de ${formatearNumero(media)} kcal` : '') +
      `; ${entreno} ${entreno === 1 ? 'día' : 'días'} de entreno. Detalle en la tabla.`
    );
  });

  protected largo(fecha: string): string {
    return DIA_LARGO.format(desdeFechaApi(fecha));
  }
}
