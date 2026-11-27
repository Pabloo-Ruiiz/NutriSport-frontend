import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { EstadisticasResponse } from '@core/models';
import { formatearNumero } from '@shared/pipes/formato';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsChartComponent } from '@shared/ui/data/chart.component';
import { opcionesMacros, tablaMacros } from '../opciones-graficos';
import { TablaGraficoComponent } from './tabla-grafico.component';

/** Macronutrientes por periodo en barras apiladas (gramos de media diaria). */
@Component({
  selector: 'app-grafico-macros',
  imports: [NS_CARD, NsChartComponent, TablaGraficoComponent],
  template: `
    <ns-card>
      <h3 nsCardTitulo>Macronutrientes</h3>
      <p nsCardSubtitulo>Gramos de media diaria por {{ periodo() }}</p>
      <ns-chart [options]="opciones()" [ariaLabel]="resumen()" [altura]="280">
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
export class GraficoMacrosComponent {
  readonly estadisticas = input.required<EstadisticasResponse>();

  protected readonly opciones = computed(() => opcionesMacros(this.estadisticas()));
  protected readonly tabla = computed(() => tablaMacros(this.estadisticas()));
  protected readonly periodo = computed(
    () => ({ DIA: 'día', SEMANA: 'semana', MES: 'mes' })[this.estadisticas().agrupacion],
  );
  protected readonly resumen = computed(() => {
    const m = this.estadisticas().mediaDiaria;
    return (
      `Macronutrientes por ${this.periodo()}: de media ${formatearNumero(m.proteina)} g de proteína, ` +
      `${formatearNumero(m.carbohidratos)} g de carbohidratos y ${formatearNumero(m.grasa)} g de grasa al día. ` +
      'Detalle en la tabla.'
    );
  });
}
