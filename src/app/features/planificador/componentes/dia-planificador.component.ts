import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

import type { MenuResponse } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA } from '@core/models/etiquetas';
import { hoyLocal } from '@core/util/fechas';
import { NsDateStripComponent } from '@shared/ui/nav/date-strip.component';
import { comidasDeFranja, franjasVisibles, type ColumnaSemana } from '../planificador';
import { CabeceraDiaComponent } from './cabecera-dia.component';
import { MealSlotComponent } from './meal-slot.component';

/**
 * Planificador por día (DESIGN.md §7.10, < 768 px): ns-date-strip de la semana y la lista vertical
 * de las comidas del día elegido, por franjas. Los días con comidas planificadas llevan un punto.
 *
 * Al elegir un día de otra semana en la tira, `fecha` cambia y quien lo usa cambia de semana.
 */
@Component({
  selector: 'app-dia-planificador',
  imports: [CabeceraDiaComponent, MealSlotComponent, NsDateStripComponent],
  template: `
    <ns-date-strip
      [(selected)]="fecha"
      [markedDates]="diasConComidas()"
      [hoy]="hoy()"
      modo="semana"
      etiqueta="Elegir día del menú"
    />

    <app-cabecera-dia [columna]="columna()" [hoy]="fecha() === hoy()" />

    @if (columna().dia; as dia) {
      @for (franja of franjas(); track franja) {
        <section class="ns-dp__franja" [attr.aria-labelledby]="'ns-dp-' + franja">
          <h3 class="ns-dp__titulo" [id]="'ns-dp-' + franja">{{ etiquetas[franja] }}</h3>
          @for (comida of comidasDeFranja(dia, franja); track comida.id) {
            <app-meal-slot [comida]="comida" />
          } @empty {
            <p class="ns-dp__vacio">Sin comida planificada</p>
          }
        </section>
      }
    } @else {
      <p class="ns-dp__fuera">Este menú no incluye este día.</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-dp__franja {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
    }
    .ns-dp__titulo {
      margin: 0;
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .ns-dp__vacio,
    .ns-dp__fuera {
      margin: 0;
      color: var(--ns-text-tertiary);
      font-size: 0.8125rem;
    }
    .ns-dp__vacio {
      padding: var(--ns-space-3);
      border: 1px dashed var(--ns-border);
      border-radius: var(--ns-radius-md);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiaPlanificadorComponent {
  readonly menu = input.required<MenuResponse>();
  /** Día elegido "AAAA-MM-DD"; admite [(fecha)]. */
  readonly fecha = model.required<string>();
  /** Fecha de hoy; se puede fijar en pruebas. */
  readonly hoy = input(hoyLocal());

  protected readonly etiquetas = ETIQUETAS_TIPO_COMIDA;
  protected readonly comidasDeFranja = comidasDeFranja;

  protected readonly columna = computed<ColumnaSemana>(() => {
    const fecha = this.fecha();
    return { fecha, dia: this.menu().dias.find((d) => d.fecha === fecha) ?? null };
  });
  protected readonly franjas = computed(() => franjasVisibles([this.columna().dia]));
  protected readonly diasConComidas = computed(() =>
    this.menu()
      .dias.filter((d) => d.comidas.length > 0)
      .map((d) => d.fecha),
  );
}
