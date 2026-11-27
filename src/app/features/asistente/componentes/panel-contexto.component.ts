import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon } from '@lucide/angular';

import type { Nutrientes } from '@core/models';
import { PerfilService } from '@core/services/perfil.service';
import { SeguimientoService } from '@core/services/seguimiento.service';
import { hoyLocal } from '@core/util/fechas';
import { formatearFecha, formatearNumero } from '@shared/pipes/formato';
import type { NsColorDato } from '@shared/ui/data/colores';
import { NsProgressBarComponent } from '@shared/ui/data/progress-bar.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { restriccionesActivas } from '../asistente';

const MACROS: { clave: keyof Nutrientes; nombre: string; unidad: string; color: NsColorDato }[] = [
  { clave: 'kcal', nombre: 'Energía', unidad: 'kcal', color: 'kcal' },
  { clave: 'proteina', nombre: 'Proteínas', unidad: 'g', color: 'protein' },
  { clave: 'carbohidratos', nombre: 'Hidratos', unidad: 'g', color: 'carbs' },
  { clave: 'grasa', nombre: 'Grasas', unidad: 'g', color: 'fat' },
];

/**
 * Contexto de hoy (DESIGN.md §7.15, columna de 300 px desde xl; en pantallas menores, en un drawer
 * que se abre con el botón info): objetivos y consumido del día, entrenamientos y restricciones
 * activas. Datos: GET /seguimiento/resumen y GET /perfil/preferencias.
 */
@Component({
  selector: 'app-panel-contexto',
  imports: [LucideDynamicIcon, NsBadgeComponent, NsProgressBarComponent, NsSkeletonComponent],
  template: `
    <div class="ns-ctx__cabecera">
      <h2 class="ns-ctx__titulo">Contexto de hoy</h2>
      <span class="ns-ctx__fecha">{{ fecha }}</span>
    </div>

    @if (resumen.isLoading()) {
      <ns-skeleton shape="rect" height="160px" />
    } @else if (resumen.hasValue()) {
      @let r = resumen.value();
      <div class="ns-ctx__macros">
        @for (m of macros; track m.clave) {
          <div class="ns-ctx__macro">
            <span class="ns-ctx__nombre" aria-hidden="true">{{ m.nombre }}</span>
            <ns-progress-bar
              [value]="redondear(r.consumido[m.clave])"
              [max]="redondear(r.objetivo[m.clave]) || 1"
              [color]="m.color"
              [unidad]="m.unidad"
              [etiqueta]="m.nombre + ' de hoy'"
              showLabel
            />
          </div>
        }
      </div>

      <section class="ns-ctx__seccion" aria-labelledby="ns-ctx-entreno">
        <h3 class="ns-ctx__subtitulo ns-text-overline" id="ns-ctx-entreno">Entrenamiento</h3>
        @for (e of r.entrenamientos; track e.id) {
          <p class="ns-ctx__entreno">
            <span class="ns-ctx__icono" aria-hidden="true"><svg lucideIcon="activity" [size]="18"></svg></span>
            <span>
              <strong>{{ e.tipoActividadNombre }}</strong>
              <span class="ns-ctx__detalle">
                {{ hora(e.fechaHora) }} · {{ e.duracionMin }} min · ~{{ n(e.kcalEstimadas) }} kcal
              </span>
            </span>
          </p>
        } @empty {
          <p class="ns-ctx__vacio">Día de descanso.</p>
        }
      </section>
    } @else {
      <p class="ns-ctx__vacio">No hemos podido cargar el resumen de hoy.</p>
    }

    <section class="ns-ctx__seccion" aria-labelledby="ns-ctx-restricciones">
      <h3 class="ns-ctx__subtitulo ns-text-overline" id="ns-ctx-restricciones">Restricciones activas</h3>
      @if (preferencias.isLoading()) {
        <ns-skeleton shape="rect" height="28px" />
      } @else if (restricciones().length) {
        <ul class="ns-ctx__restricciones" role="list">
          @for (t of restricciones(); track t) {
            <li>
              <ns-badge icon="shield-check">{{ t }}</ns-badge>
            </li>
          }
        </ul>
      } @else {
        <p class="ns-ctx__vacio">Sin alergias, intolerancias ni dietas.</p>
      }
    </section>

    <p class="ns-ctx__aviso">
      <svg lucideIcon="lock" [size]="16" aria-hidden="true"></svg>
      El asistente solo consulta tus datos para responder. Cualquier cambio en tu plan o tus registros lo haces tú.
    </p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-5);
    }
    p,
    h2,
    h3 {
      margin: 0;
    }
    .ns-ctx__cabecera {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--ns-space-2);
    }
    .ns-ctx__titulo {
      color: var(--ns-text);
      font: 600 1rem/1.5rem var(--ns-font-display);
    }
    .ns-ctx__fecha,
    .ns-ctx__detalle {
      color: var(--ns-text-tertiary);
      font: 500 0.75rem/1rem var(--ns-font-body);
    }
    .ns-ctx__macros {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
    }
    .ns-ctx__macro {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-1);
    }
    .ns-ctx__nombre {
      color: var(--ns-text-secondary);
      font: 500 0.875rem/1.25rem var(--ns-font-body);
    }
    .ns-ctx__seccion {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
      padding-top: var(--ns-space-4);
      border-top: 1px solid var(--ns-border);
    }
    .ns-ctx__subtitulo {
      color: var(--ns-text-tertiary);
    }
    .ns-ctx__entreno {
      display: flex;
      gap: var(--ns-space-3);
      align-items: flex-start;
      font-size: 0.875rem;
      > span:last-child {
        display: flex;
        flex-direction: column;
      }
    }
    .ns-ctx__icono {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--ns-radius-md);
      background: var(--ns-surface-muted);
      color: var(--ns-data-activity);
    }
    .ns-ctx__restricciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-ctx__vacio {
      color: var(--ns-text-secondary);
      font-size: 0.875rem;
    }
    .ns-ctx__aviso {
      display: flex;
      gap: var(--ns-space-2);
      align-items: flex-start;
      padding: var(--ns-space-3);
      border: 1px solid var(--ns-info-border);
      border-radius: var(--ns-radius-lg);
      background: var(--ns-info-bg);
      color: var(--ns-info);
      font: 400 0.8125rem/1.25rem var(--ns-font-body);
      svg {
        flex: none;
        margin-top: 2px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelContextoComponent {
  private readonly seguimiento = inject(SeguimientoService);
  private readonly perfil = inject(PerfilService);

  protected readonly macros = MACROS;
  protected readonly n = formatearNumero;
  protected readonly fecha = formatearFecha(hoyLocal(), 'corta');

  protected readonly resumen = rxResource({ stream: () => this.seguimiento.resumen() });
  protected readonly preferencias = rxResource({ stream: () => this.perfil.preferencias() });
  protected readonly restricciones = computed(() =>
    this.preferencias.hasValue() ? restriccionesActivas(this.preferencias.value()) : [],
  );

  protected redondear(v: number | null | undefined): number {
    return Math.round(v ?? 0);
  }

  protected hora(iso: string): string {
    return formatearFecha(iso, 'hora');
  }
}
