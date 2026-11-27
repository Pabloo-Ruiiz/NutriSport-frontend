import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { EstadisticasResponse } from '@core/models';
import { formatearNumero } from '@shared/pipes/formato';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsChartComponent } from '@shared/ui/data/chart.component';
import { opcionesEnergia, tablaEnergia } from '../opciones-graficos';
import { TablaGraficoComponent } from './tabla-grafico.component';

/**
 * Energía consumida frente al objetivo (gráfico principal de DESIGN.md §7.14). Con "Comparar", la
 * media del periodo anterior como línea gris discontinua.
 */
@Component({
  selector: 'app-grafico-energia',
  imports: [NS_CARD, NsChartComponent, TablaGraficoComponent],
  template: `
    <ns-card>
      <h3 nsCardTitulo>Energía consumida frente al objetivo</h3>
      <p nsCardSubtitulo>{{ subtitulo() }}</p>
      <ns-chart [options]="opciones()" [ariaLabel]="resumen()" [altura]="300">
        <app-tabla-grafico [tabla]="tabla()" />
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
export class GraficoEnergiaComponent {
  readonly estadisticas = input.required<EstadisticasResponse>();
  /** Kcal medias diarias del periodo anterior (null sin comparar o sin datos). */
  readonly mediaAnterior = input<number | null>(null);

  protected readonly opciones = computed(() => opcionesEnergia(this.estadisticas(), this.mediaAnterior()));
  protected readonly tabla = computed(() => tablaEnergia(this.estadisticas(), this.mediaAnterior()));
  protected readonly subtitulo = computed(() => {
    const porPeriodo = { DIA: 'cada día', SEMANA: 'media diaria de cada semana', MES: 'media diaria de cada mes' };
    return `Kcal consumidas, ${porPeriodo[this.estadisticas().agrupacion]}; el objetivo varía según tu entrenamiento`;
  });
  protected readonly resumen = computed(() => {
    const e = this.estadisticas();
    const anterior = this.mediaAnterior();
    return (
      `Energía: media de ${formatearNumero(e.mediaDiaria.kcal)} kcal al día frente a un objetivo medio de ` +
      `${formatearNumero(e.objetivoMedio?.kcal)} kcal` +
      (anterior !== null ? `; el periodo anterior, ${formatearNumero(anterior)} kcal` : '') +
      '. Detalle en la tabla.'
    );
  });
}
