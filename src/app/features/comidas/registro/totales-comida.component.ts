import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { formatearNumero } from '@shared/pipes/formato';
import { NsProgressBarComponent } from '@shared/ui/data/progress-bar.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import type { Estimacion } from './comida-editor.store';

/**
 * Totales de la comida en construcción: kcal y mini barras de proteína, hidratos y grasa (cada una
 * con su parte de la energía). Lleva "Estimación" mientras no los haya calculado el servidor.
 */
@Component({
  selector: 'app-totales-comida',
  imports: [NsBadgeComponent, NsProgressBarComponent],
  template: `
    <div class="ns-totales__cabecera">
      <p class="ns-totales__kcal">
        <span class="ns-text-metric-lg ns-tnum">{{ formatear(totales().kcal) }}</span>
        <span class="ns-totales__unidad">kcal</span>
      </p>
      @if (totales().esEstimacion) {
        <ns-badge icon="info">Estimación</ns-badge>
      } @else {
        <ns-badge variant="success" icon="circle-check">Calculado</ns-badge>
      }
    </div>
    <ul class="ns-totales__macros" role="list">
      @for (m of macros(); track m.nombre) {
        <li class="ns-totales__macro">
          <span class="ns-totales__macro-nombre">{{ m.nombre }}</span>
          <span class="ns-tnum">{{ formatear(m.gramos, 1) }} g</span>
          <ns-progress-bar
            class="ns-totales__barra"
            [value]="m.kcal"
            [max]="totalKcalMacros()"
            [color]="m.color"
            [alto]="6"
            unidad="kcal"
            [etiqueta]="m.nombre + ': ' + formatear(m.gramos, 1) + ' g'"
          />
        </li>
      }
    </ul>
    @if (totales().esEstimacion) {
      <p class="ns-totales__nota">Calculado con los valores por 100 g. Al guardar verás el cálculo final.</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
    }
    .ns-totales__cabecera {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--ns-space-3);
    }
    .ns-totales__kcal {
      display: flex;
      align-items: baseline;
      gap: var(--ns-space-1);
      margin: 0;
    }
    .ns-totales__unidad {
      color: var(--ns-text-secondary);
    }
    .ns-totales__macros {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--ns-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-totales__macro {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 0.8125rem;
    }
    .ns-totales__macro-nombre {
      color: var(--ns-text-secondary);
    }
    .ns-totales__barra {
      margin-top: var(--ns-space-1);
    }
    .ns-totales__nota {
      margin: 0;
      color: var(--ns-text-tertiary);
      font-size: 0.75rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TotalesComidaComponent {
  readonly totales = input.required<Estimacion>();

  protected readonly formatear = formatearNumero;
  protected readonly macros = computed(() => {
    const t = this.totales();
    return [
      { nombre: 'Proteína', gramos: t.proteina, kcal: t.proteina * 4, color: 'protein' as const },
      { nombre: 'Hidratos', gramos: t.carbohidratos, kcal: t.carbohidratos * 4, color: 'carbs' as const },
      { nombre: 'Grasa', gramos: t.grasa, kcal: t.grasa * 9, color: 'fat' as const },
    ];
  });
  /** Las barras muestran la parte de cada macro en la energía de los tres. */
  protected readonly totalKcalMacros = computed(() =>
    Math.max(
      1,
      this.macros().reduce((s, m) => s + m.kcal, 0),
    ),
  );
}
