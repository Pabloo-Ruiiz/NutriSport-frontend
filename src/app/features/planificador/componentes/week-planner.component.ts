import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { MenuResponse } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA } from '@core/models/etiquetas';
import { hoyLocal } from '@core/util/fechas';
import { columnasSemana, comidasDeFranja, franjasVisibles } from '../planificador';
import { CabeceraDiaComponent } from './cabecera-dia.component';
import { MealSlotComponent } from './meal-slot.component';

/**
 * Rejilla semanal del planificador (ns-week-planner, DESIGN.md §7.10), desde 768 px: 7 columnas
 * (lunes a domingo) × franjas (Desayuno, Comida, Merienda, Cena y las demás solo si hay comidas de
 * ese tipo). Es una tabla: cada celda se anuncia con su día y su franja.
 *
 * En md (768–1023 px) se desplaza en horizontal con 3,5 días visibles; la columna de franjas queda
 * fija a la izquierda.
 */
@Component({
  selector: 'app-week-planner',
  imports: [CabeceraDiaComponent, MealSlotComponent],
  template: `
    <div class="ns-wp__scroll" tabindex="0" role="region" aria-label="Menú de la semana">
      <table class="ns-wp__tabla">
        <caption class="ns-sr-only">
          Comidas planificadas por día y franja
        </caption>
        <colgroup>
          <col class="ns-wp__col-franja" />
          @for (c of columnas(); track c.fecha) {
            <col />
          }
        </colgroup>
        <thead>
          <tr>
            <td class="ns-wp__esquina"></td>
            @for (c of columnas(); track c.fecha) {
              <th scope="col" class="ns-wp__dia" [attr.data-fecha]="c.fecha">
                <app-cabecera-dia [columna]="c" [hoy]="c.fecha === hoy()" />
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (franja of franjas(); track franja) {
            <tr>
              <th scope="row" class="ns-wp__franja">{{ etiquetas[franja] }}</th>
              @for (c of columnas(); track c.fecha) {
                <td class="ns-wp__celda" [class.ns-wp__celda--fuera]="!c.dia">
                  @for (comida of comidasDeFranja(c.dia, franja); track comida.id) {
                    <app-meal-slot [comida]="comida" />
                  } @empty {
                    <span class="ns-sr-only">Sin comida</span>
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    @use 'abstracts/breakpoints' as bp;

    :host {
      display: block;
      container-type: inline-size;
    }
    .ns-wp__scroll {
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scroll-snap-type: x proximity;
      border-radius: var(--ns-radius-md);

      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
    }
    .ns-wp__tabla {
      --ns-wp-franja: 104px;
      width: 100%;
      table-layout: fixed;
      border-collapse: separate;
      border-spacing: var(--ns-space-2);
      margin: calc(-1 * var(--ns-space-2));

      // md: 3,5 días visibles, el resto con scroll horizontal.
      @include bp.down(lg) {
        width: calc(var(--ns-wp-franja) + 7 * (100cqi - var(--ns-wp-franja)) / 3.5);
      }
    }
    .ns-wp__col-franja {
      width: var(--ns-wp-franja);
    }
    .ns-wp__franja,
    .ns-wp__esquina {
      position: sticky;
      left: 0;
      z-index: 1;
      background: var(--ns-bg);
    }
    .ns-wp__franja {
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;
      text-align: left;
      vertical-align: middle;
    }
    .ns-wp__dia {
      padding: 0;
      font-weight: inherit;
      text-align: left;
      vertical-align: top;
      scroll-snap-align: start;
    }
    .ns-wp__dia app-cabecera-dia {
      height: 100%;
    }
    .ns-wp__celda {
      padding: 0;
      vertical-align: top;
    }
    .ns-wp__celda > app-meal-slot + app-meal-slot {
      margin-top: var(--ns-space-2);
    }
    .ns-wp__celda:empty,
    .ns-wp__celda:has(> .ns-sr-only:only-child) {
      height: 64px;
      border: 1px dashed var(--ns-border);
      border-radius: var(--ns-radius-md);
    }
    .ns-wp__celda--fuera {
      background: var(--ns-surface-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekPlannerComponent {
  readonly menu = input.required<MenuResponse>();
  /** Lunes de la semana visible. */
  readonly semana = input.required<string>();
  /** Fecha de hoy; se puede fijar en pruebas. */
  readonly hoy = input(hoyLocal());

  protected readonly etiquetas = ETIQUETAS_TIPO_COMIDA;
  protected readonly comidasDeFranja = comidasDeFranja;

  protected readonly columnas = computed(() => columnasSemana(this.menu(), this.semana()));
  protected readonly franjas = computed(() => franjasVisibles(this.columnas().map((c) => c.dia)));
}
