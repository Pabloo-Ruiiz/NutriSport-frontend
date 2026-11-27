import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import type { ComidaPlanificadaResponse, MenuResponse } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA } from '@core/models/etiquetas';
import { hoyLocal } from '@core/util/fechas';
import { columnasSemana, comidasDeFranja, franjasVisibles } from '../planificador';
import { PlanificadorEditor, type DestinoComida } from '../planificador-editor';
import { CabeceraDiaComponent } from './cabecera-dia.component';
import { MealSlotComponent } from './meal-slot.component';

/**
 * Rejilla semanal del planificador (ns-week-planner, DESIGN.md §7.10), desde 768 px: 7 columnas
 * (lunes a domingo) × franjas (Desayuno, Comida, Merienda, Cena y las demás solo si hay comidas de
 * ese tipo). Es una tabla: cada celda se anuncia con su día y su franja.
 *
 * En md (768–1023 px) se desplaza en horizontal con 3,5 días visibles; la columna de franjas queda
 * fija a la izquierda.
 *
 * Con PlanificadorEditor (paso 31): cada celda del menú es una zona de CDK drag & drop
 * (cdkDropListGroup); al soltar una comida en otra celda → PUT { fecha, tipoComida }, que se ve al
 * momento y se revierte si falla. Las consumidas no se arrastran. La alternativa accesible es
 * "Mover a…" en el menú de cada comida. Las celdas vacías tienen "Añadir receta".
 */
@Component({
  selector: 'app-week-planner',
  imports: [CabeceraDiaComponent, CdkDrag, CdkDropList, CdkDropListGroup, LucideDynamicIcon, MealSlotComponent],
  template: `
    <div class="ns-wp__scroll" tabindex="0" role="region" aria-label="Menú de la semana">
      <table class="ns-wp__tabla" cdkDropListGroup>
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
                  <div
                    class="ns-wp__zona"
                    cdkDropList
                    cdkDropListSortingDisabled
                    [cdkDropListData]="{ fecha: c.fecha, tipoComida: franja }"
                    [cdkDropListDisabled]="!c.dia || !editor"
                    (cdkDropListDropped)="soltar($event)"
                  >
                    @for (comida of comidasDeFranja(c.dia, franja); track comida.id) {
                      <app-meal-slot
                        cdkDrag
                        [cdkDragData]="comida"
                        [cdkDragDisabled]="comida.consumida || !editor"
                        [comida]="comida"
                      />
                    } @empty {
                      @if (c.dia && editor) {
                        <button
                          type="button"
                          class="ns-wp__anadir"
                          (click)="editor.abrirReceta({ modo: 'anadir', fecha: c.fecha, tipoComida: franja })"
                        >
                          <svg lucideIcon="plus" [size]="16" aria-hidden="true"></svg>
                          Añadir receta
                        </button>
                      } @else {
                        <span class="ns-sr-only">Sin comida</span>
                      }
                    }
                  </div>
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
      // Bloque contenedor de los elementos absolutos de la tabla (textos ns-sr-only, botones de acciones):
      // sin esto no se recortan con el scroll y ensanchan la página.
      position: relative;
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
      // Ancho mínimo de cada día: por debajo, los nombres de las recetas se partían letra a letra
      // (p. ej. a 1024 px con la sidebar expandida). Si los 7 días no caben, la tabla hace scroll.
      // 108 px: a 1280 px (sidebar expandida, ~937 px útiles) caben los 7 días sin scroll.
      --ns-wp-dia-min: 108px;
      width: 100%;
      min-width: calc(var(--ns-wp-franja) + 7 * var(--ns-wp-dia-min) + 8 * var(--ns-space-2));
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
    .ns-wp__zona {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
      min-height: 64px;
      height: 100%;
      border-radius: var(--ns-radius-md);
    }
    .ns-wp__zona:has(> .ns-sr-only:only-child) {
      border: 1px dashed var(--ns-border);
    }
    // Zona sobre la que se arrastra una comida.
    .ns-wp__zona.cdk-drop-list-receiving {
      outline: 2px dashed var(--ns-action-primary);
      outline-offset: 2px;
    }
    .ns-wp__zona.cdk-drop-list-dragging .ns-wp__anadir {
      visibility: hidden;
    }
    app-meal-slot.cdk-drag:not(.cdk-drag-disabled) {
      cursor: grab;
    }
    app-meal-slot.cdk-drag-placeholder {
      opacity: 0.4;
    }
    .ns-wp__anadir {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      gap: var(--ns-space-2);
      min-height: 64px;
      padding: var(--ns-space-2);
      border: 1px dashed var(--ns-border-strong);
      border-radius: var(--ns-radius-md);
      background: transparent;
      color: var(--ns-text-secondary);
      font: inherit;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        border-color: var(--ns-action-primary);
        background: var(--ns-success-bg);
        color: var(--ns-action-primary);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
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

  protected readonly editor = inject(PlanificadorEditor, { optional: true });
  protected readonly etiquetas = ETIQUETAS_TIPO_COMIDA;
  protected readonly comidasDeFranja = comidasDeFranja;

  protected readonly columnas = computed(() => columnasSemana(this.menu(), this.semana()));
  protected readonly franjas = computed(() => franjasVisibles(this.columnas().map((c) => c.dia)));

  /** Al soltar en otra celda: PUT { fecha, tipoComida } (se ve al momento y se revierte si falla). */
  protected soltar(evento: CdkDragDrop<DestinoComida, DestinoComida, ComidaPlanificadaResponse>): void {
    if (evento.previousContainer === evento.container) return;
    void this.editor?.mover(evento.item.data, evento.container.data, true);
  }
}
