import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import type { RegistroComidaResponse } from '@core/models';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { MealCardComponent } from '../../comidas/componentes/meal-card.component';
import { franjasDelDia } from '../dashboard';

/**
 * Comidas del día (DESIGN.md §7.4): timeline por franja en el orden del día con las tarjetas
 * `meal`; las franjas fijas vacías llevan "Añadir" (al registro con el tipo y la fecha). Arriba,
 * "Registrar con foto" (ai) y "Buscar alimento" (secondary). Sin comidas, el estado vacío.
 *
 * Las comidas del plan pendientes (comidasPlanificadasPendientes) llegarán en el paso 31.
 */
@Component({
  selector: 'app-comidas-hoy',
  imports: [LucideDynamicIcon, MealCardComponent, NS_CARD, NsButtonComponent, NsEmptyStateComponent, RouterLink],
  template: `
    <ns-card>
      <h3 nsCardTitulo>{{ titulo() }}</h3>
      <p nsCardSubtitulo>
        {{ comidas().length === 1 ? '1 registrada' : comidas().length + ' registradas' }}
      </p>
      <div nsCardAcciones class="ns-ch__acciones">
        <a nsButton variant="ai" size="sm" icon="camera" routerLink="/comidas/foto" [queryParams]="{ fecha: fecha() }"
          >Registrar con foto</a
        >
        <a nsButton variant="secondary" size="sm" icon="search" routerLink="/comidas/nueva" [queryParams]="params()"
          >Buscar alimento</a
        >
      </div>

      @if (comidas().length === 0) {
        <ns-empty-state
          icon="utensils"
          [titulo]="esHoy() ? 'Aún no has registrado comidas hoy' : 'No hay comidas este día'"
          [nivelTitulo]="4"
          descripcion="Haz una foto del plato o busca los alimentos para registrarla."
        >
          <a nsButton variant="ai" icon="camera" routerLink="/comidas/foto" [queryParams]="{ fecha: fecha() }"
            >Registrar con foto</a
          >
          <a nsButton variant="secondary" icon="search" routerLink="/comidas/nueva" [queryParams]="params()"
            >Buscar alimento</a
          >
        </ns-empty-state>
      } @else {
        <ol class="ns-ch__timeline" role="list">
          @for (f of franjas(); track f.tipo) {
            <li class="ns-ch__franja">
              <div class="ns-ch__franja-cabecera">
                <h4 class="ns-ch__franja-nombre">{{ f.etiqueta }}</h4>
                @if (f.hora) {
                  <span class="ns-ch__franja-hora ns-tnum">{{ f.hora }}</span>
                }
              </div>
              @if (f.comidas.length) {
                <ul class="ns-ch__comidas" role="list">
                  @for (c of f.comidas; track c.id) {
                    <li>
                      <app-meal-card
                        [comida]="c"
                        (ver)="ver.emit($event)"
                        (editar)="editar.emit($event)"
                        (duplicar)="duplicar.emit($event)"
                        (eliminar)="eliminar.emit($event)"
                      />
                    </li>
                  }
                </ul>
              } @else {
                <a class="ns-ch__anadir" routerLink="/comidas/nueva" [queryParams]="params(f.tipo)">
                  <svg lucideIcon="plus" [size]="16" aria-hidden="true"></svg>
                  Añadir {{ f.etiqueta.toLowerCase() }}
                </a>
              }
            </li>
          }
        </ol>
      }
    </ns-card>
  `,
  styles: `
    @use 'abstracts/breakpoints' as bp;

    :host {
      display: block;
    }
    .ns-ch__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-2);
    }
    .ns-ch__timeline {
      display: flex;
      flex-direction: column;
      margin: var(--ns-space-2) 0 0;
      padding: 0;
      list-style: none;
    }
    .ns-ch__franja {
      display: grid;
      grid-template-columns: 112px minmax(0, 1fr);
      align-items: start;
      gap: var(--ns-space-3);
      padding: var(--ns-space-3) 0;
      border-bottom: 1px solid var(--ns-border);
      &:last-child {
        border-bottom: 0;
      }
      @include bp.down(sm) {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--ns-space-2);
      }
    }
    .ns-ch__franja-cabecera {
      display: flex;
      flex-direction: column;
      padding-top: var(--ns-space-2);
      @include bp.down(sm) {
        flex-direction: row;
        gap: var(--ns-space-2);
        padding-top: 0;
      }
    }
    .ns-ch__franja-nombre {
      margin: 0;
      font: 600 0.875rem/1.25rem var(--ns-font-body);
    }
    .ns-ch__franja-hora {
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
    }
    .ns-ch__comidas {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-ch__anadir {
      display: flex;
      align-items: center;
      gap: var(--ns-space-2);
      min-height: 48px;
      padding: 0 var(--ns-space-4);
      border: 1px dashed var(--ns-border-strong);
      border-radius: var(--ns-radius-lg);
      color: var(--ns-text-secondary);
      text-decoration: none;
      &:hover {
        border-color: var(--ns-text-tertiary);
        background: var(--ns-surface-muted);
        color: var(--ns-text);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComidasHoyComponent {
  readonly comidas = input.required<RegistroComidaResponse[]>();
  /** Día que se muestra ("AAAA-MM-DD"). */
  readonly fecha = input.required<string>();
  readonly esHoy = input(true);
  /** URL a la que vuelve el registro tras guardar (p. ej. "/inicio?fecha=2026-11-20"). */
  readonly volver = input('/inicio');

  readonly ver = output<RegistroComidaResponse>();
  readonly editar = output<RegistroComidaResponse>();
  readonly duplicar = output<RegistroComidaResponse>();
  readonly eliminar = output<RegistroComidaResponse>();

  protected readonly titulo = computed(() => (this.esHoy() ? 'Comidas de hoy' : 'Comidas del día'));
  protected readonly franjas = computed(() => franjasDelDia(this.comidas()));

  /** Parámetros del registro: fecha, vuelta y, si se indica, el tipo de comida. */
  protected params(tipoComida?: string): Record<string, string> {
    return { ...(tipoComida ? { tipoComida } : {}), fecha: this.fecha(), volver: this.volver() };
  }
}
