import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import type { EntrenamientoResponse, EstadoEntrenamiento, Intensidad } from '@core/models';
import { ETIQUETAS_ESTADO_ENTRENAMIENTO, ETIQUETAS_INTENSIDAD } from '@core/models/etiquetas';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsCardComponent } from '@shared/ui/card/card.component';
import { NsBadgeComponent, type NsBadgeVariant } from '@shared/ui/feedback/badge.component';
import { formatearFechaHora, haLlegado } from '../actividad';

const VARIANTES_ESTADO: Record<EstadoEntrenamiento, NsBadgeVariant> = {
  PLANIFICADO: 'info',
  REALIZADO: 'success',
  OMITIDO: 'neutral',
};

/** Barras de intensidad: 1, 2 o 3 llenas (forma además de texto). */
const NIVELES: Record<Intensidad, number> = { BAJA: 1, MEDIA: 2, ALTA: 3 };

/**
 * Un entrenamiento en la lista de Actividad (DESIGN.md §7.13): tipo, fecha y hora, duración,
 * intensidad, kcal estimadas y estado. "Marcar como realizado" solo en los planificados cuya hora
 * ya ha llegado; el menú ⋯ ofrece Omitir (planificados), Editar y Eliminar.
 */
@Component({
  selector: 'app-entrenamiento-item',
  imports: [
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    LucideDynamicIcon,
    NsBadgeComponent,
    NsButtonComponent,
    NsCardComponent,
  ],
  template: `
    <ns-card padding="sm">
      <div class="ns-ent">
        <span class="ns-ent__icono" aria-hidden="true"><svg lucideIcon="activity" [size]="22"></svg></span>
        <div class="ns-ent__textos">
          <div class="ns-ent__cabecera">
            <h4 class="ns-ent__tipo">{{ e().tipoActividadNombre }}</h4>
            <ns-badge [variant]="varianteEstado()">{{ estado() }}</ns-badge>
          </div>
          <p class="ns-ent__fecha">{{ fecha() }}</p>
          <p class="ns-ent__datos ns-tnum">
            <span>{{ n(e().duracionMin) }} min</span>
            <span class="ns-ent__intensidad">
              <span class="ns-ent__niveles" aria-hidden="true">
                @for (i of [1, 2, 3]; track i) {
                  <span class="ns-ent__nivel" [class.ns-ent__nivel--lleno]="i <= nivel()"></span>
                }
              </span>
              Intensidad {{ intensidad() }}
            </span>
            @if (e().rpe !== null) {
              <span>RPE {{ e().rpe }}</span>
            }
            @if (e().distanciaKm !== null) {
              <span>{{ n(e().distanciaKm, 2) }} km</span>
            }
            <span class="ns-ent__kcal">{{ n(e().kcalEstimadas) }} kcal</span>
          </p>
          @if (puedeRealizar()) {
            <div class="ns-ent__acciones">
              <button nsButton type="button" size="sm" variant="secondary" icon="check" (click)="realizar.emit(e())">
                Marcar como realizado
              </button>
            </div>
          }
        </div>
        <button
          type="button"
          class="ns-ent__menu"
          [cdkMenuTriggerFor]="menu"
          [attr.aria-label]="'Opciones de ' + e().tipoActividadNombre + ', ' + fecha()"
        >
          <svg lucideIcon="ellipsis" [size]="20" aria-hidden="true"></svg>
        </button>
      </div>
    </ns-card>

    <ng-template #menu>
      <div class="ns-menu" cdkMenu>
        @if (e().estado === 'PLANIFICADO') {
          <button type="button" class="ns-menu__item" cdkMenuItem (cdkMenuItemTriggered)="omitir.emit(e())">
            <svg lucideIcon="x" [size]="18" aria-hidden="true"></svg>
            Omitir
          </button>
        }
        <button type="button" class="ns-menu__item" cdkMenuItem (cdkMenuItemTriggered)="editar.emit(e())">
          <svg lucideIcon="pencil" [size]="18" aria-hidden="true"></svg>
          Editar
        </button>
        <hr class="ns-menu__separador" />
        <button
          type="button"
          class="ns-menu__item ns-menu__item--peligro"
          cdkMenuItem
          (cdkMenuItemTriggered)="eliminar.emit(e())"
        >
          <svg lucideIcon="trash" [size]="18" aria-hidden="true"></svg>
          Eliminar
        </button>
      </div>
    </ng-template>
  `,
  styles: `
    @use 'components/menu';

    :host {
      display: block;
    }
    .ns-ent {
      display: flex;
      align-items: flex-start;
      gap: var(--ns-space-3);
    }
    .ns-ent__icono {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: var(--ns-radius-lg);
      background: var(--ns-data-activity-bg);
      color: var(--ns-data-activity);
    }
    .ns-ent__textos {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .ns-ent__cabecera {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ns-space-2);
    }
    .ns-ent__tipo {
      margin: 0;
      font: 600 1rem/1.5rem var(--ns-font-body);
      overflow-wrap: anywhere;
    }
    .ns-ent__fecha {
      margin: 0;
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
      &::first-letter {
        text-transform: uppercase;
      }
    }
    .ns-ent__datos {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ns-space-1) var(--ns-space-3);
      margin: var(--ns-space-1) 0 0;
      font-size: 0.8125rem;
    }
    .ns-ent__intensidad {
      display: inline-flex;
      align-items: center;
      gap: var(--ns-space-1);
    }
    .ns-ent__niveles {
      display: inline-flex;
      align-items: flex-end;
      gap: 2px;
      height: 12px;
    }
    .ns-ent__nivel {
      width: 4px;
      border: 1px solid var(--ns-data-activity);
      border-radius: 1px;
      &:nth-child(1) {
        height: 6px;
      }
      &:nth-child(2) {
        height: 9px;
      }
      &:nth-child(3) {
        height: 12px;
      }
    }
    .ns-ent__nivel--lleno {
      background: var(--ns-data-activity);
    }
    .ns-ent__kcal {
      font-weight: 600;
    }
    .ns-ent__acciones {
      margin-top: var(--ns-space-2);
    }
    .ns-ent__menu {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 40px;
      height: 40px;
      margin: -8px -8px 0 0;
      @media (max-width: 767.98px) {
        width: 44px;
        height: 44px;
        margin: -10px -10px 0 0;
      }
      border: 0;
      border-radius: var(--ns-radius-md);
      background: transparent;
      color: var(--ns-text-secondary);
      cursor: pointer;
      &:hover,
      &[aria-expanded='true'] {
        background: var(--ns-surface-muted);
        color: var(--ns-text);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
    }

    @include menu.contextual;
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntrenamientoItemComponent {
  readonly entrenamiento = input.required<EntrenamientoResponse>();

  readonly realizar = output<EntrenamientoResponse>();
  readonly omitir = output<EntrenamientoResponse>();
  readonly editar = output<EntrenamientoResponse>();
  readonly eliminar = output<EntrenamientoResponse>();

  protected readonly e = this.entrenamiento;
  protected readonly fecha = computed(() => formatearFechaHora(this.e().fechaHora));
  protected readonly estado = computed(() => ETIQUETAS_ESTADO_ENTRENAMIENTO[this.e().estado]);
  protected readonly varianteEstado = computed(() => VARIANTES_ESTADO[this.e().estado]);
  protected readonly intensidad = computed(() => ETIQUETAS_INTENSIDAD[this.e().intensidad].toLowerCase());
  protected readonly nivel = computed(() => NIVELES[this.e().intensidad]);
  protected readonly puedeRealizar = computed(() => this.e().estado === 'PLANIFICADO' && haLlegado(this.e()));

  protected readonly n = formatearNumero;
}
