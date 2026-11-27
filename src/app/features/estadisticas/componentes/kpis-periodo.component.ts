import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { LayoutService } from '@core/layout/layout.service';
import { formatearNumero } from '@shared/pipes/formato';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsMetricComponent } from '@shared/ui/data/metric.component';
import type { KpisPeriodo } from '../estadisticas';

/**
 * KPIs del periodo (DESIGN.md §7.14): energía media, proteína media, días en objetivo y peso. Con
 * "Comparar", cada uno lleva su variación frente al periodo anterior (en % o en puntos). La
 * variación del peso va en tono neutro (subir o bajar depende del objetivo de cada uno). En móvil,
 * carrusel horizontal.
 */
@Component({
  selector: 'app-kpis-periodo',
  imports: [NS_CARD, NsMetricComponent],
  template: `
    <ul class="ns-kpis" role="list" aria-label="Resumen del periodo" [attr.tabindex]="layout.esMovil() ? 0 : null">
      <li>
        <ns-card variant="metric" padding="sm">
          <ns-metric
            label="Energía media"
            [value]="kpis().kcal"
            unit="kcal/día"
            [delta]="kpis().deltaKcalPct"
            unidadDelta="%"
            [contextoDelta]="contexto()"
          />
          @if (kpis().kcalPctObjetivo !== null) {
            <p class="ns-kpis__nota">{{ kpis().kcalPctObjetivo }} % del objetivo medio</p>
          }
        </ns-card>
      </li>
      <li>
        <ns-card variant="metric" padding="sm">
          <ns-metric
            label="Proteína media"
            [value]="kpis().proteina"
            unit="g/día"
            [delta]="kpis().deltaProteinaPct"
            unidadDelta="%"
            [contextoDelta]="contexto()"
          />
          <p class="ns-kpis__nota">{{ notaProteina() }}</p>
        </ns-card>
      </li>
      <li>
        <ns-card variant="metric" padding="sm">
          <ns-metric
            label="Días en objetivo"
            [value]="kpis().adherencia"
            unit="%"
            [delta]="kpis().deltaAdherenciaPts"
            unidadDelta="pts"
            [contextoDelta]="contexto()"
          />
          <p class="ns-kpis__nota">
            {{ kpis().diasEnObjetivo }} de {{ kpis().diasConRegistro }} días con registro · margen ±10 %
          </p>
        </ns-card>
      </li>
      <li>
        <ns-card variant="metric" padding="sm">
          <ns-metric
            label="Peso actual"
            [value]="kpis().pesoActual"
            unit="kg"
            [decimales]="1"
            [delta]="kpis().variacionPeso ?? undefined"
            contextoDelta="en el periodo"
            neutro
          />
          @if (kpis().pesoActual === null) {
            <p class="ns-kpis__nota">Sin pesajes en el periodo</p>
          }
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
      gap: var(--ns-space-4);
      margin: 0;
      padding: 0;
      list-style: none;
      > li > ns-card {
        height: 100%;
      }
      @include bp.down(lg) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      @include bp.down(md) {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scroll-padding-inline: var(--ns-space-4);
        margin-inline: calc(-1 * var(--ns-space-4));
        padding: 2px var(--ns-space-4) var(--ns-space-2);
        > li {
          flex: 0 0 min(220px, 72%);
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
export class KpisPeriodoComponent {
  readonly kpis = input.required<KpisPeriodo>();
  /** Con qué se compara ("frente a la semana anterior"); solo se ve si hay variación. */
  readonly contexto = input<string>();
  protected readonly layout = inject(LayoutService);

  protected notaProteina(): string {
    const k = this.kpis();
    const partes: string[] = [];
    if (k.proteinaGKg !== null) partes.push(`${formatearNumero(k.proteinaGKg, 1)} g/kg`);
    if (k.proteinaObjetivo !== null) partes.push(`objetivo ${formatearNumero(k.proteinaObjetivo)} g`);
    return partes.join(' · ') || 'Sin objetivo de proteína';
  }
}
