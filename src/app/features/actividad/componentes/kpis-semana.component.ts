import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { LayoutService } from '@core/layout/layout.service';

import { NS_CARD } from '@shared/ui/card/card.component';
import { NsMetricComponent } from '@shared/ui/data/metric.component';
import type { KpisSemana } from '../actividad';

/**
 * KPIs de la semana (DESIGN.md §7.13): sesiones realizadas, minutos, kcal estimadas y carga
 * (duración × RPE). En móvil, carrusel horizontal con scroll-snap.
 */
@Component({
  selector: 'app-kpis-semana',
  imports: [NS_CARD, NsMetricComponent],
  template: `
    <ul class="ns-kpis" role="list" aria-label="Resumen de la semana" [attr.tabindex]="layout.esMovil() ? 0 : null">
      <li>
        <ns-card variant="metric" padding="sm"><ns-metric label="Sesiones" [value]="kpis().sesiones" /></ns-card>
      </li>
      <li>
        <ns-card variant="metric" padding="sm"
          ><ns-metric label="Minutos" [value]="kpis().minutos" unit="min"
        /></ns-card>
      </li>
      <li>
        <ns-card variant="metric" padding="sm">
          <ns-metric label="Gasto estimado" [value]="kpis().kcal" unit="kcal" />
        </ns-card>
      </li>
      <li>
        <ns-card variant="metric" padding="sm">
          <ns-metric label="Carga" [value]="kpis().carga" unit="UA" />
          <p class="ns-kpis__nota">Duración × RPE{{ kpis().sinRpe ? ' · ' + kpis().sinRpe + ' sin RPE' : '' }}</p>
        </ns-card>
      </li>
    </ul>
  `,
  styles: `
    @use 'abstracts/breakpoints' as bp;

    .ns-kpis {
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--ns-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
      > li > ns-card {
        height: 100%;
      }
      @include bp.down(md) {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scroll-padding-inline: var(--ns-space-4);
        margin-inline: calc(-1 * var(--ns-space-4));
        padding: 2px var(--ns-space-4) var(--ns-space-2);
        > li {
          flex: 0 0 min(160px, 42%);
          scroll-snap-align: start;
        }
      }
    }
    .ns-kpis__nota {
      margin: var(--ns-space-1) 0 0;
      color: var(--ns-text-tertiary);
      font-size: 0.75rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpisSemanaComponent {
  readonly kpis = input.required<KpisSemana>();
  /** En móvil es un carrusel: se hace enfocable para desplazarlo con el teclado. */
  protected readonly layout = inject(LayoutService);
}
