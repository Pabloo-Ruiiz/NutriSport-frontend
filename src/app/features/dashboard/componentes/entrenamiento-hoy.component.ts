import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import type { EntrenamientoResponse, EstadoEntrenamiento } from '@core/models';
import { ETIQUETAS_ESTADO_ENTRENAMIENTO, ETIQUETAS_INTENSIDAD } from '@core/models/etiquetas';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsBadgeComponent, type NsBadgeVariant } from '@shared/ui/feedback/badge.component';
import { haLlegado } from '../../actividad/actividad';

const VARIANTES: Record<EstadoEntrenamiento, NsBadgeVariant> = {
  PLANIFICADO: 'info',
  REALIZADO: 'success',
  OMITIDO: 'neutral',
};

const HORA = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

/**
 * Entrenamientos del día (DESIGN.md §7.4), en color activity: tipo, hora, intensidad, RPE,
 * duración y gasto estimado. "Marcar como realizado" en los planificados cuya hora ya ha llegado
 * (lo hace el dashboard, que recarga el resumen). Sin entrenamientos: "Día de descanso".
 */
@Component({
  selector: 'app-entrenamiento-hoy',
  imports: [LucideDynamicIcon, NS_CARD, NsBadgeComponent, NsButtonComponent, RouterLink],
  template: `
    <ns-card>
      <h3 nsCardTitulo>{{ esHoy() ? 'Entrenamiento de hoy' : 'Entrenamiento del día' }}</h3>
      @if (entrenamientos().length === 0) {
        <p nsCardSubtitulo>Día de descanso</p>
      } @else {
        <p nsCardSubtitulo>
          {{ entrenamientos().length === 1 ? '1 sesión' : entrenamientos().length + ' sesiones' }}
        </p>
      }
      <a nsCardAcciones nsButton variant="ghost" size="sm" routerLink="/actividad">Ver actividad</a>

      @if (entrenamientos().length === 0) {
        <div class="ns-eh__descanso">
          <svg lucideIcon="moon" [size]="20" aria-hidden="true"></svg>
          <p>Hoy toca recuperar. Si entrenas, regístralo para ajustar tu objetivo.</p>
        </div>
        <button nsButton type="button" variant="secondary" icon="plus" fullWidth (click)="registrar.emit()">
          Registrar entrenamiento
        </button>
      } @else {
        <ul class="ns-eh__lista" role="list">
          @for (e of entrenamientos(); track e.id) {
            <li class="ns-eh__item">
              <div class="ns-eh__panel">
                <span class="ns-eh__icono" aria-hidden="true"><svg lucideIcon="activity" [size]="20"></svg></span>
                <div class="ns-eh__textos">
                  <p class="ns-eh__tipo">
                    {{ e.tipoActividadNombre }}
                    <ns-badge [variant]="variante(e)">{{ estado(e) }}</ns-badge>
                  </p>
                  <p class="ns-eh__detalle">
                    {{ hora(e) }} · intensidad {{ intensidad(e) }}{{ e.rpe !== null ? ' · RPE ' + e.rpe : '' }}
                  </p>
                </div>
              </div>
              <dl class="ns-eh__datos">
                <div>
                  <dt>Duración</dt>
                  <dd>
                    <span class="ns-tnum">{{ n(e.duracionMin) }}</span> min
                  </dd>
                </div>
                <div>
                  <dt>Gasto est.</dt>
                  <dd>
                    <span class="ns-tnum">{{ n(e.kcalEstimadas) }}</span> kcal
                  </dd>
                </div>
                @if (e.distanciaKm !== null) {
                  <div>
                    <dt>Distancia</dt>
                    <dd>
                      <span class="ns-tnum">{{ n(e.distanciaKm, 1) }}</span> km
                    </dd>
                  </div>
                }
              </dl>
              @if (puedeRealizar(e)) {
                <button
                  nsButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon="check"
                  [loading]="marcando() === e.id"
                  (click)="realizar.emit(e)"
                >
                  Marcar como realizado
                </button>
              }
            </li>
          }
        </ul>
      }
    </ns-card>
  `,
  styles: `
    :host {
      display: block;
    }
    .ns-eh__descanso {
      display: flex;
      align-items: flex-start;
      gap: var(--ns-space-3);
      margin-bottom: var(--ns-space-4);
      padding: var(--ns-space-4);
      border-radius: var(--ns-radius-lg);
      background: var(--ns-surface-muted);
      color: var(--ns-text-secondary);
      p {
        margin: 0;
      }
    }
    .ns-eh__lista {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-5);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-eh__item {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
    }
    .ns-eh__panel {
      display: flex;
      align-items: center;
      gap: var(--ns-space-3);
      padding: var(--ns-space-3) var(--ns-space-4);
      border-radius: var(--ns-radius-lg);
      background: var(--ns-data-activity-bg);
    }
    .ns-eh__icono {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: var(--ns-radius-md);
      background: var(--ns-surface);
      color: var(--ns-data-activity);
    }
    .ns-eh__textos {
      min-width: 0;
    }
    .ns-eh__tipo {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ns-space-2);
      margin: 0;
      font-weight: 600;
    }
    .ns-eh__detalle {
      margin: 2px 0 0;
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
    }
    .ns-eh__datos {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--ns-space-3);
      margin: 0;
      dt {
        color: var(--ns-text-secondary);
        font-size: 0.75rem;
      }
      dd {
        margin: 0;
        color: var(--ns-text-secondary);
        font-size: 0.8125rem;
        span {
          color: var(--ns-text);
          font: 600 1.125rem/1.5rem var(--ns-font-display);
        }
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntrenamientoHoyComponent {
  readonly entrenamientos = input.required<EntrenamientoResponse[]>();
  readonly esHoy = input(true);
  /** Id del que se está marcando (botón con spinner). */
  readonly marcando = input<string | null>(null);

  readonly realizar = output<EntrenamientoResponse>();
  readonly registrar = output<void>();

  protected readonly n = formatearNumero;
  protected readonly ahora = computed(() => {
    this.entrenamientos();
    return new Date();
  });

  protected hora(e: EntrenamientoResponse): string {
    return HORA.format(new Date(e.fechaHora));
  }
  protected intensidad(e: EntrenamientoResponse): string {
    return ETIQUETAS_INTENSIDAD[e.intensidad].toLowerCase();
  }
  protected estado(e: EntrenamientoResponse): string {
    return ETIQUETAS_ESTADO_ENTRENAMIENTO[e.estado];
  }
  protected variante(e: EntrenamientoResponse): NsBadgeVariant {
    return VARIANTES[e.estado];
  }
  protected puedeRealizar(e: EntrenamientoResponse): boolean {
    return e.estado === 'PLANIFICADO' && haLlegado(e, this.ahora());
  }
}
