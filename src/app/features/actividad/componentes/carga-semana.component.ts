import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { hoyLocal } from '@core/util/fechas';
import type { DiaCarga } from '../actividad';

/** Escala mínima de las barras: una semana suave no llena el gráfico. */
const MINUTOS_ESCALA_MIN = 60;

/**
 * Carga por día (DESIGN.md §7.13): barras CSS (sin ECharts) de lunes a domingo con un tramo por
 * entrenamiento. La intensidad se distingue por color Y por patrón (baja: puntos, media: rayas,
 * alta: liso); lo planificado va con borde discontinuo. Cada día lleva su descripción en texto para
 * lectores de pantalla y los minutos visibles encima de la barra.
 */
@Component({
  selector: 'app-carga-semana',
  template: `
    <ol class="ns-carga" role="list">
      @for (d of dias(); track d.fecha) {
        <li class="ns-carga__dia" [class.ns-carga__dia--hoy]="d.fecha === hoy">
          <span class="ns-sr-only">{{ d.descripcion }}</span>
          <span class="ns-carga__minutos ns-tnum" aria-hidden="true">{{ d.minutos ? d.minutos : '' }}</span>
          <span class="ns-carga__pista" aria-hidden="true">
            <span class="ns-carga__barra" [style.height.%]="(d.minutos / escala()) * 100">
              @for (s of d.segmentos; track s.id) {
                <span
                  class="ns-carga__tramo"
                  [class]="'ns-carga__tramo--' + s.intensidad.toLowerCase()"
                  [class.ns-carga__tramo--planificado]="s.planificado"
                  [style.flex-grow]="s.minutos"
                ></span>
              }
            </span>
          </span>
          <span class="ns-carga__inicial" aria-hidden="true">{{ d.inicial }}</span>
        </li>
      }
    </ol>
    <ul class="ns-carga__leyenda" aria-label="Leyenda">
      <li><span class="ns-carga__muestra ns-carga__tramo--baja" aria-hidden="true"></span>Baja</li>
      <li><span class="ns-carga__muestra ns-carga__tramo--media" aria-hidden="true"></span>Media</li>
      <li><span class="ns-carga__muestra ns-carga__tramo--alta" aria-hidden="true"></span>Alta</li>
      <li>
        <span class="ns-carga__muestra ns-carga__tramo--media ns-carga__tramo--planificado" aria-hidden="true"></span
        >Planificado
      </li>
    </ul>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
    }
    .ns-carga {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: var(--ns-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-carga__dia {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ns-space-1);
    }
    .ns-carga__minutos {
      min-height: 1rem;
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
    }
    .ns-carga__pista {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      width: 100%;
      height: 140px;
      border-radius: var(--ns-radius-md);
      background: var(--ns-surface-muted);
    }
    .ns-carga__barra {
      display: flex;
      flex-direction: column-reverse;
      gap: 2px;
      width: min(32px, 70%);
      min-height: 0;
    }
    .ns-carga__tramo {
      flex-basis: 0;
      min-height: 4px;
      border-radius: var(--ns-radius-sm);
    }
    .ns-carga__inicial {
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
      font-weight: 600;
    }
    .ns-carga__dia--hoy .ns-carga__inicial {
      color: var(--ns-text);
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    // Intensidad: color + patrón (no depende solo del color).
    .ns-carga__tramo--alta {
      background: var(--ns-data-activity);
    }
    .ns-carga__tramo--media {
      background: repeating-linear-gradient(135deg, var(--ns-data-activity) 0 4px, var(--ns-data-activity-bg) 4px 7px);
    }
    .ns-carga__tramo--baja {
      border: 1px solid var(--ns-data-activity);
      background-color: var(--ns-data-activity-bg);
      background-image: radial-gradient(var(--ns-data-activity) 1px, transparent 1.5px);
      background-size: 6px 6px;
    }
    .ns-carga__tramo--planificado {
      outline: 2px dashed var(--ns-text-secondary);
      outline-offset: -2px;
      opacity: 0.55;
    }
    .ns-carga__leyenda {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-2) var(--ns-space-4);
      margin: 0;
      padding: 0;
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
      list-style: none;
      li {
        display: flex;
        align-items: center;
        gap: var(--ns-space-1);
      }
    }
    .ns-carga__muestra {
      display: inline-block;
      width: 14px;
      height: 14px;
      border-radius: var(--ns-radius-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargaSemanaComponent {
  readonly dias = input.required<DiaCarga[]>();

  protected readonly hoy = hoyLocal();
  protected readonly escala = computed(() => Math.max(MINUTOS_ESCALA_MIN, ...this.dias().map((d) => d.minutos)));
}
