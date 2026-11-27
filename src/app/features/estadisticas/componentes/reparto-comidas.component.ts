import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { EstadisticasResponse, TipoComida } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA } from '@core/models/etiquetas';
import { formatearKcal } from '@shared/pipes/formato';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsChartComponent } from '@shared/ui/data/chart.component';
import { opcionesComidas, tablaComidas } from '../opciones-graficos';
import { TablaGraficoComponent } from './tabla-grafico.component';

/** Reparto por comidas (DESIGN.md §7.14): kcal medias diarias de cada tipo de comida en barras horizontales. */
@Component({
  selector: 'app-reparto-comidas',
  imports: [NS_CARD, NsChartComponent, TablaGraficoComponent],
  template: `
    <ns-card>
      <h3 nsCardTitulo>Reparto por comidas</h3>
      <p nsCardSubtitulo>Kcal medias al día de cada tipo de comida</p>
      @if (tabla().filas.length) {
        <ns-chart [options]="opciones()" [ariaLabel]="resumen()" [altura]="altura()">
          <app-tabla-grafico [tabla]="tabla()" />
        </ns-chart>
      } @else {
        <p class="ns-comidas__vacio">Sin comidas registradas en el periodo.</p>
      }
    </ns-card>
  `,
  styles: `
    :host {
      display: block;
    }
    .ns-comidas__vacio {
      margin: 0;
      color: var(--ns-text-secondary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepartoComidasComponent {
  readonly estadisticas = input.required<EstadisticasResponse>();

  protected readonly opciones = computed(() => opcionesComidas(this.estadisticas()));
  protected readonly tabla = computed(() => tablaComidas(this.estadisticas()));
  /** 36 px por barra, con un mínimo. */
  protected readonly altura = computed(() => Math.max(160, this.tabla().filas.length * 36 + 24));
  protected readonly resumen = computed(() => {
    const porTipo = Object.entries(this.estadisticas().kcalPorTipoComida).filter(([, kcal]) => kcal > 0);
    const [tipo, kcal] = porTipo.reduce((max, actual) => (actual[1] > max[1] ? actual : max), ['', 0]);
    return (
      `Reparto por comidas: ${porTipo.length} tipos de comida` +
      (tipo
        ? `; la que más aporta es ${ETIQUETAS_TIPO_COMIDA[tipo as TipoComida] ?? tipo} con ${formatearKcal(kcal)} de media`
        : '') +
      '. Detalle en la tabla.'
    );
  });
}
