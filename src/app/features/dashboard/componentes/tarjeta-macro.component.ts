import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { ResumenDiarioResponse } from '@core/models';
import { formatearNumero } from '@shared/pipes/formato';
import { NS_CARD } from '@shared/ui/card/card.component';
import type { NsColorDato } from '@shared/ui/data/colores';
import { NsProgressBarComponent } from '@shared/ui/data/progress-bar.component';
import { type Macro, comidasQueMasAportan } from '../dashboard';

const DATOS: Record<Macro, { nombre: string; color: NsColorDato }> = {
  proteina: { nombre: 'Proteína', color: 'protein' },
  carbohidratos: { nombre: 'Hidratos', color: 'carbs' },
  grasa: { nombre: 'Grasa', color: 'fat' },
};

/**
 * Tarjeta de un macro (DESIGN.md §7.4): consumido de objetivo, barra de progreso con su color, lo
 * que falta (o cuánto se ha pasado, en tono neutro) y las 2 comidas del día que más aportan.
 */
@Component({
  selector: 'app-tarjeta-macro',
  imports: [NS_CARD, NsProgressBarComponent],
  template: `
    <ns-card class="ns-macro" padding="sm">
      <div class="ns-macro__cabecera">
        <h3 class="ns-macro__nombre">{{ datos().nombre }}</h3>
        <span class="ns-macro__pct ns-tnum">{{ n(r().porcentajes[macro()]) }} %</span>
      </div>
      <p class="ns-macro__cifra">
        <span class="ns-text-metric-lg ns-tnum">{{ n(consumido()) }}</span>
        <span class="ns-macro__de ns-tnum">/ {{ n(objetivo()) }} g</span>
      </p>
      <ns-progress-bar
        [value]="consumido()"
        [max]="objetivo()"
        [color]="datos().color"
        unidad="g"
        [etiqueta]="datos().nombre + ': ' + n(consumido()) + ' de ' + n(objetivo()) + ' g'"
      />
      <p class="ns-macro__resto">
        @if (restante() > 0) {
          Te faltan <strong class="ns-tnum">{{ n(restante()) }} g</strong>
        } @else if (consumido() > objetivo()) {
          <strong class="ns-tnum">{{ n(consumido() - objetivo()) }} g</strong> más de lo previsto
        } @else {
          Objetivo cubierto
        }
      </p>
      <div class="ns-macro__fuentes">
        <h4 class="ns-macro__overline">Principales fuentes</h4>
        @if (fuentes().length) {
          <p class="ns-macro__lista">
            @for (f of fuentes(); track f.id; let ultimo = $last) {
              <span
                >{{ f.etiqueta }} <span class="ns-tnum">{{ n(f.gramos) }} g</span></span
              >
              @if (!ultimo) {
                <span aria-hidden="true"> · </span>
              }
            }
          </p>
        } @else {
          <p class="ns-macro__lista ns-macro__lista--vacia">Sin comidas todavía</p>
        }
      </div>
    </ns-card>
  `,
  styles: `
    :host {
      display: block;
    }
    .ns-macro {
      height: 100%;
    }
    .ns-macro__cabecera {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--ns-space-2);
    }
    .ns-macro__nombre,
    .ns-macro__overline {
      margin: 0;
      color: var(--ns-text-tertiary);
      font: 600 0.75rem/1rem var(--ns-font-body);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .ns-macro__pct {
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
    }
    .ns-macro__cifra {
      display: flex;
      align-items: baseline;
      gap: var(--ns-space-1);
      margin: var(--ns-space-1) 0 var(--ns-space-2);
    }
    .ns-macro__de {
      color: var(--ns-text-secondary);
      font-size: 0.875rem;
    }
    .ns-macro__resto {
      margin: var(--ns-space-2) 0 0;
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
      strong {
        color: var(--ns-text);
      }
    }
    .ns-macro__fuentes {
      margin-top: var(--ns-space-3);
      padding-top: var(--ns-space-3);
      border-top: 1px solid var(--ns-border);
    }
    .ns-macro__lista {
      margin: var(--ns-space-1) 0 0;
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
    }
    .ns-macro__lista--vacia {
      color: var(--ns-text-tertiary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarjetaMacroComponent {
  readonly macro = input.required<Macro>();
  readonly resumen = input.required<ResumenDiarioResponse>();

  protected readonly r = this.resumen;
  protected readonly n = formatearNumero;
  protected readonly datos = computed(() => DATOS[this.macro()]);
  protected readonly consumido = computed(() => this.r().consumido[this.macro()]);
  protected readonly objetivo = computed(() => this.r().objetivo[this.macro()]);
  protected readonly restante = computed(() => Math.max(0, this.r().restante[this.macro()]));
  protected readonly fuentes = computed(() => comidasQueMasAportan(this.r().comidas, this.macro()));
}
