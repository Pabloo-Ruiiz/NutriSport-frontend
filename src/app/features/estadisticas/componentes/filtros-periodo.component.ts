import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { Agrupacion } from '@core/models';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSegmentedComponent } from '@shared/ui/form/segmented.component';
import { NsSwitchComponent } from '@shared/ui/form/switch.component';
import {
  AGRUPACIONES,
  type FiltrosEstadisticas,
  PERIODOS,
  type Periodo,
  type PeriodoRapido,
  agrupacionPorDefecto,
  errorRango,
  rangoDePeriodo,
} from '../estadisticas';

/**
 * Filtros de las estadísticas (DESIGN.md §7.14): periodo (7 días · 4 semanas · 3 meses ·
 * Personalizado), agrupación (Día / Semana / Mes) y "Comparar con el periodo anterior".
 *
 * No guarda estado propio: recibe los filtros de la URL y emite los nuevos en `cambiar` (la página
 * los lleva a los queryParams). Solo el rango personalizado se edita aquí hasta pulsar "Aplicar",
 * con el error de validación (≤ 366 días, no futuro, fin ≥ inicio) junto a las fechas.
 */
@Component({
  selector: 'app-filtros-periodo',
  imports: [
    FormsModule,
    NsButtonComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsSegmentedComponent,
    NsSwitchComponent,
  ],
  template: `
    <div class="ns-filtros__fila">
      <ns-segmented
        etiqueta="Periodo"
        [opciones]="periodos"
        [ngModel]="periodoMostrado()"
        (ngModelChange)="elegirPeriodo($event)"
      />
      <ns-segmented
        etiqueta="Agrupar por"
        [opciones]="agrupaciones"
        [ngModel]="filtros().agrupacion"
        (ngModelChange)="elegirAgrupacion($event)"
      />
      <ns-switch [ngModel]="filtros().comparar" (ngModelChange)="emitir({ comparar: $event })">
        Comparar con el periodo anterior
      </ns-switch>
    </div>

    @if (periodoMostrado() === 'personalizado') {
      <form class="ns-filtros__rango" (ngSubmit)="aplicarRango()" aria-label="Periodo personalizado">
        <ns-form-field label="Desde">
          <input
            nsInput
            type="date"
            name="desde"
            [max]="hoy()"
            [ngModel]="desde()"
            (ngModelChange)="desde.set($event)"
          />
        </ns-form-field>
        <ns-form-field label="Hasta">
          <input
            nsInput
            type="date"
            name="hasta"
            [max]="hoy()"
            [ngModel]="hasta()"
            (ngModelChange)="hasta.set($event)"
          />
        </ns-form-field>
        <button nsButton type="submit" variant="secondary">Aplicar</button>
        @if (errorMostrado()) {
          <p class="ns-filtros__error" role="alert">{{ errorMostrado() }}</p>
        }
      </form>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
    }
    .ns-filtros__fila {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-3) var(--ns-space-4);
      align-items: center;
    }
    .ns-filtros__rango {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-3);
      align-items: flex-end;
    }
    .ns-filtros__error {
      flex-basis: 100%;
      margin: 0;
      color: var(--ns-error);
      font: 500 0.875rem/1.25rem var(--ns-font-body);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltrosPeriodoComponent {
  readonly filtros = input.required<FiltrosEstadisticas>();
  readonly hoy = input.required<string>();
  readonly cambiar = output<FiltrosEstadisticas>();

  protected readonly periodos = PERIODOS.map((p) => ({ valor: p.valor, etiqueta: p.etiqueta }));
  protected readonly agrupaciones = AGRUPACIONES.map((a) => ({ valor: a.valor, etiqueta: a.etiqueta }));

  /** "Personalizado" se marca al elegirlo, antes de aplicar un rango. */
  private readonly editandoRango = linkedSignal({ source: this.filtros, computation: () => false });
  protected readonly periodoMostrado = computed<Periodo>(() =>
    this.editandoRango() ? 'personalizado' : this.filtros().periodo,
  );

  protected readonly desde = linkedSignal(() => this.filtros().desde);
  protected readonly hasta = linkedSignal(() => this.filtros().hasta);
  private readonly intentado = linkedSignal({ source: this.filtros, computation: () => false });
  protected readonly error = computed(() => errorRango(this.desde(), this.hasta(), this.hoy()));
  /** El error se enseña tras pulsar "Aplicar" (no mientras se escribe la primera fecha). */
  protected readonly errorMostrado = computed(() => (this.intentado() ? this.error() : null));

  protected elegirPeriodo(periodo: Periodo): void {
    if (periodo === 'personalizado') {
      this.editandoRango.set(true);
      return;
    }
    const rango = rangoDePeriodo(periodo as PeriodoRapido, this.hoy());
    this.emitir({ periodo, ...rango, agrupacion: agrupacionPorDefecto(rango.desde, rango.hasta) });
  }

  protected elegirAgrupacion(agrupacion: Agrupacion): void {
    this.emitir({ agrupacion });
  }

  protected aplicarRango(): void {
    this.intentado.set(true);
    if (this.error()) return;
    const desde = this.desde();
    const hasta = this.hasta();
    this.emitir({ periodo: 'personalizado', desde, hasta, agrupacion: agrupacionPorDefecto(desde, hasta) });
  }

  protected emitir(cambios: Partial<FiltrosEstadisticas>): void {
    this.cambiar.emit({ ...this.filtros(), ...cambios });
  }
}
