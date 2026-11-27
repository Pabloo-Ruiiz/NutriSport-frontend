import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { SeriePesoResponse } from '@core/models';
import { formatearNumero } from '@shared/pipes/formato';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsChartComponent } from '@shared/ui/data/chart.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { opcionesPeso, tablaPeso } from '../opciones-graficos';
import { TablaGraficoComponent } from './tabla-grafico.component';

/** Evolución del peso en el periodo: pesajes y media móvil de 7 días. */
@Component({
  selector: 'app-grafico-peso',
  imports: [NS_CARD, NsChartComponent, NsEmptyStateComponent, TablaGraficoComponent],
  template: `
    <ns-card>
      <h3 nsCardTitulo>Evolución del peso</h3>
      <p nsCardSubtitulo>Pesajes y media móvil de 7 días</p>
      @if (serie().puntos.length) {
        <ns-chart [options]="opciones()" [ariaLabel]="resumen()" [altura]="240">
          <app-tabla-grafico [tabla]="tabla()" />
        </ns-chart>
      } @else {
        <ns-empty-state
          icon="scale"
          titulo="Sin pesajes en este periodo"
          descripcion="Registra tu peso desde el inicio o tu perfil para ver su evolución."
          [nivelTitulo]="4"
        />
      }
    </ns-card>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficoPesoComponent {
  readonly serie = input.required<SeriePesoResponse>();

  protected readonly opciones = computed(() => opcionesPeso(this.serie()));
  protected readonly tabla = computed(() => tablaPeso(this.serie()));
  protected readonly resumen = computed(() => {
    const s = this.serie();
    const ultimo = s.puntos.at(-1);
    return (
      `Peso: ${s.puntos.length} ${s.puntos.length === 1 ? 'pesaje' : 'pesajes'}` +
      (ultimo ? `, el último de ${formatearNumero(ultimo.pesoKg, 1)} kg` : '') +
      (s.variacion !== null ? `; variación de ${formatearNumero(s.variacion, 1)} kg` : '') +
      '. Detalle en la tabla.'
    );
  });
}
