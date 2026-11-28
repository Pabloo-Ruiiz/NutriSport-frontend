import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { ResumenDiarioResponse } from '@core/models';
import { formatearNumero } from '@shared/pipes/formato';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsRingComponent } from '@shared/ui/data/ring.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';

/** Margen para el badge "En objetivo" (§7.14: días en objetivo = energía en ±10 %). */
const MARGEN_OBJETIVO = 0.1;

/**
 * Tarjeta héroe de energía (DESIGN.md §7.4): anillo de 180 px con las kcal restantes en el centro
 * (o "+X kcal" si se ha pasado, en tono neutro) y anillo interior con el gasto del entrenamiento;
 * desglose consumido / objetivo / entreno / base (objetivo − entreno).
 */
@Component({
  selector: 'app-tarjeta-energia',
  imports: [NS_CARD, NsBadgeComponent, NsRingComponent],
  template: `
    <ns-card class="ns-energia">
      <h3 nsCardTitulo>{{ titulo() }}</h3>
      <p nsCardSubtitulo>{{ r().kcalEntreno > 0 ? 'Objetivo ajustado con tu entrenamiento' : 'Objetivo del día' }}</p>
      @if (enObjetivo()) {
        <ns-badge nsCardAcciones variant="success" icon="check">En objetivo</ns-badge>
      }

      <div class="ns-energia__cuerpo">
        <ns-ring
          [size]="180"
          [value]="r().consumido.kcal"
          [max]="r().objetivo.kcal"
          color="kcal"
          unidad="kcal"
          etiqueta="Energía consumida"
          [valueInterior]="r().kcalEntreno > 0 ? r().kcalEntreno : undefined"
          [maxInterior]="r().objetivo.kcal"
          etiquetaInterior="Gasto del entrenamiento"
          [mostrarExceso]="false"
        >
          @if (exceso() > 0) {
            <span class="ns-energia__caption">Más de lo previsto</span>
            <span class="ns-text-metric-xl ns-tnum">+{{ n(exceso()) }}</span>
            <span class="ns-energia__de">kcal</span>
          } @else {
            <span class="ns-energia__caption">Restantes</span>
            <span class="ns-text-metric-xl ns-tnum">{{ n(r().restante.kcal) }}</span>
            <span class="ns-energia__de">de {{ n(r().objetivo.kcal) }} kcal</span>
          }
        </ns-ring>

        <dl class="ns-energia__desglose">
          <div>
            <dt><span class="ns-energia__punto ns-energia__punto--kcal" aria-hidden="true"></span>Consumido</dt>
            <dd>
              <span class="ns-tnum">{{ n(r().consumido.kcal) }}</span> <span class="ns-energia__u">kcal</span>
            </dd>
          </div>
          <div>
            <dt><span class="ns-energia__punto ns-energia__punto--objetivo" aria-hidden="true"></span>Objetivo</dt>
            <dd>
              <span class="ns-tnum">{{ n(r().objetivo.kcal) }}</span> <span class="ns-energia__u">kcal</span>
            </dd>
          </div>
          <div>
            <dt><span class="ns-energia__punto ns-energia__punto--entreno" aria-hidden="true"></span>Entreno</dt>
            <dd>
              <span class="ns-tnum">+{{ n(r().kcalEntreno) }}</span> <span class="ns-energia__u">kcal</span>
            </dd>
          </div>
          <div>
            <dt><span class="ns-energia__punto ns-energia__punto--base" aria-hidden="true"></span>Base</dt>
            <dd>
              <span class="ns-tnum">{{ n(base()) }}</span> <span class="ns-energia__u">kcal</span>
            </dd>
          </div>
        </dl>
      </div>
    </ns-card>
  `,
  styles: `
    :host {
      display: block;
    }
    .ns-energia {
      height: 100%;
    }
    .ns-energia__cuerpo {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: var(--ns-space-6);
      padding-top: var(--ns-space-3);
    }
    .ns-energia__caption {
      color: var(--ns-text-secondary);
      font: 600 0.75rem/1rem var(--ns-font-body);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .ns-energia__de {
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
      text-align: center;
    }
    .ns-energia__desglose {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, auto));
      gap: var(--ns-space-4) var(--ns-space-6);
      margin: 0;
      dt {
        display: flex;
        align-items: center;
        gap: var(--ns-space-2);
        color: var(--ns-text-secondary);
        font: 600 0.75rem/1rem var(--ns-font-body);
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      dd {
        margin: 2px 0 0;
        font: 600 1.375rem/1.75rem var(--ns-font-display);
      }
    }
    .ns-energia__u {
      color: var(--ns-text-secondary);
      font: 500 0.8125rem/1rem var(--ns-font-body);
    }
    .ns-energia__punto {
      width: 8px;
      height: 8px;
      border-radius: var(--ns-radius-full);
    }
    .ns-energia__punto--kcal {
      background: var(--ns-data-kcal);
    }
    .ns-energia__punto--objetivo {
      background: var(--ns-text-secondary);
    }
    .ns-energia__punto--entreno {
      background: var(--ns-data-activity);
    }
    .ns-energia__punto--base {
      border: 2px solid var(--ns-text-secondary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarjetaEnergiaComponent {
  readonly resumen = input.required<ResumenDiarioResponse>();
  readonly titulo = input('Energía de hoy');

  protected readonly r = this.resumen;
  protected readonly n = formatearNumero;
  protected readonly base = computed(() => this.r().objetivo.kcal - this.r().kcalEntreno);
  protected readonly exceso = computed(() => Math.max(0, this.r().excesoKcal ?? 0));
  protected readonly enObjetivo = computed(() => {
    const { consumido, objetivo } = this.r();
    return objetivo.kcal > 0 && Math.abs(consumido.kcal - objetivo.kcal) <= objetivo.kcal * MARGEN_OBJETIVO;
  });
}
