import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { formatearFecha } from '@shared/pipes/formato';
import { GramosPipe } from '@shared/pipes/gramos.pipe';
import { NumeroPipe } from '@shared/pipes/numero.pipe';
import { NsProgressBarComponent } from '@shared/ui/data/progress-bar.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { diaSemanaCorto, type ColumnaSemana } from '../planificador';

/**
 * Cabecera de un día del planificador (DESIGN.md §7.10): día y fecha, kcal planificadas frente al
 * objetivo con `porcentajeObjetivo`, los hidratos del día y, si es día de entreno, el icono
 * activity con su tinte. Todas las cifras vienen del servidor.
 */
@Component({
  selector: 'app-cabecera-dia',
  imports: [GramosPipe, LucideDynamicIcon, NsBadgeComponent, NsProgressBarComponent, NumeroPipe],
  template: `
    <div class="ns-cdia__fila">
      <p class="ns-cdia__dia">
        <span aria-hidden="true">{{ diaSemana() }}</span>
        <strong aria-hidden="true">{{ numero() }}</strong>
        <span class="ns-sr-only">{{ fechaLarga() }}</span>
      </p>
      @if (hoy()) {
        <ns-badge variant="info">Hoy</ns-badge>
      }
      @if (dia()?.diaEntreno) {
        <svg class="ns-cdia__entreno" lucideIcon="activity" [size]="16" aria-hidden="true"></svg>
        <span class="ns-sr-only">Día de entreno</span>
      }
    </div>

    @if (dia(); as dia) {
      <p class="ns-cdia__kcal">
        <strong>{{ dia.planificado.kcal | numero }}</strong>
        @if (dia.objetivo) {
          <span class="ns-cdia__objetivo"> / {{ dia.objetivo.total.kcal | numero }} kcal</span>
        } @else {
          <span class="ns-cdia__objetivo"> kcal</span>
        }
      </p>
      @if (dia.objetivo) {
        <ns-progress-bar
          [value]="dia.planificado.kcal"
          [max]="dia.objetivo.total.kcal"
          color="kcal"
          [alto]="6"
          etiqueta="Kcal planificadas frente al objetivo"
          unidad="kcal"
        />
      }
      <p class="ns-cdia__pie">
        @if (dia.objetivo) {
          {{ dia.porcentajeObjetivo | numero }} % ·
        }
        <abbr title="Hidratos de carbono">HC</abbr> {{ dia.planificado.carbohidratos | gramos }}
      </p>
    } @else {
      <p class="ns-cdia__vacio">Fuera del menú</p>
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
      font-variant-numeric: tabular-nums;
    }
    :host(.ns-cdia--entreno) {
      border-color: var(--ns-data-activity);
      background: var(--ns-data-activity-bg);
    }
    :host(.ns-cdia--hoy) {
      border-color: var(--ns-text);
    }
    .ns-cdia__fila {
      display: flex;
      align-items: center;
      gap: var(--ns-space-2);
      min-height: 22px;
    }
    .ns-cdia__dia {
      display: flex;
      gap: var(--ns-space-1);
      margin: 0;
      font-size: 0.875rem;
    }
    .ns-cdia__entreno {
      margin-left: auto;
      color: var(--ns-data-activity);
    }
    .ns-cdia__kcal {
      margin: 0;
      font-size: 0.8125rem;
    }
    .ns-cdia__objetivo,
    .ns-cdia__pie,
    .ns-cdia__vacio {
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
    }
    .ns-cdia__pie,
    .ns-cdia__vacio {
      margin: 0;
    }
    abbr {
      text-decoration: none;
    }
  `,
  host: {
    class: 'ns-cdia',
    '[class.ns-cdia--entreno]': 'dia()?.diaEntreno',
    '[class.ns-cdia--hoy]': 'hoy()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CabeceraDiaComponent {
  readonly columna = input.required<ColumnaSemana>();
  readonly hoy = input(false, { transform: booleanAttribute });

  protected readonly dia = computed(() => this.columna().dia);
  protected readonly diaSemana = computed(() => diaSemanaCorto(this.columna().fecha));
  protected readonly numero = computed(() => Number(this.columna().fecha.slice(8, 10)));
  protected readonly fechaLarga = computed(() => formatearFecha(this.columna().fecha, 'larga'));
}
