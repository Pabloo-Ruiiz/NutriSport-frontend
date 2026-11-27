import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { ComidaPlanificadaResponse } from '@core/models';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { GramosPipe } from '@shared/pipes/gramos.pipe';
import { formatearNumero } from '@shared/pipes/formato';
import { KcalPipe } from '@shared/pipes/kcal.pipe';

/**
 * Comida planificada (meal-slot, DESIGN.md §7.10): nombre de la receta (13 px), kcal y proteína
 * (12 px) y badges "Bloqueada" y "Consumida". Sin miniatura. Las acciones (sustituir, bloquear,
 * eliminar…) se añaden en el paso 31.
 */
@Component({
  selector: 'app-meal-slot',
  imports: [GramosPipe, KcalPipe, NsBadgeComponent],
  template: `
    <p class="ns-slot__nombre">{{ comida().receta.nombre }}</p>
    <p class="ns-slot__cifras">
      {{ comida().nutrientes.kcal | kcal }} · <abbr title="Proteína">P</abbr>
      {{ comida().nutrientes.proteina | gramos }}
      @if (comida().raciones !== 1) {
        · {{ raciones() }} rac.
      }
    </p>
    @if (comida().bloqueada || comida().consumida) {
      <div class="ns-slot__badges">
        @if (comida().bloqueada) {
          <ns-badge icon="lock">Bloqueada</ns-badge>
        }
        @if (comida().consumida) {
          <ns-badge variant="success" icon="check">Consumida</ns-badge>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-1);
      min-width: 0;
      padding: var(--ns-space-3);
      border: 1px solid var(--ns-border);
      border-radius: var(--ns-radius-md);
      background: var(--ns-surface);
    }
    :host(.ns-slot--consumida) {
      border-color: var(--ns-success-border);
    }
    .ns-slot__nombre {
      display: -webkit-box;
      margin: 0;
      overflow: hidden;
      color: var(--ns-text);
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1.125rem;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow-wrap: anywhere;
    }
    .ns-slot__cifras {
      margin: 0;
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
      line-height: 1rem;
      font-variant-numeric: tabular-nums;
    }
    abbr {
      text-decoration: none;
    }
    .ns-slot__badges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-1);
      margin-top: var(--ns-space-1);
    }
  `,
  host: { class: 'ns-slot', '[class.ns-slot--consumida]': 'comida().consumida' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealSlotComponent {
  readonly comida = input.required<ComidaPlanificadaResponse>();

  /** Raciones en formato es-ES y sin decimales sobrantes: 2 → "2", 1.5 → "1,5", 1.25 → "1,25". */
  protected readonly raciones = computed(() => formatearRaciones(this.comida().raciones));
}

/** 2 → "2", 1.5 → "1,5", 1.25 → "1,25" (como mucho dos decimales). */
export function formatearRaciones(raciones: number): string {
  const decimales = Number.isInteger(raciones) ? 0 : Number.isInteger(raciones * 10) ? 1 : 2;
  return formatearNumero(raciones, decimales);
}
