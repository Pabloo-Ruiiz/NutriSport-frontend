import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import type { ComidasDiaResponse, RegistroComidaResponse } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA } from '@core/models/etiquetas';
import { ComidasService } from '@core/services/comidas.service';
import { aApiError } from '@core/util/api-error';
import { hoyLocal, sumarDias } from '@core/util/fechas';
import { formatearFecha, formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';

/** Días hacia atrás que se ofrecen para copiar. */
export const DIAS_COPIAR = 7;

/**
 * "Copiar comida anterior" (DESIGN.md §7.6): comidas de los últimos 7 días (GET /comidas), la más
 * reciente primero. Se cierra con la comida elegida.
 */
@Component({
  selector: 'app-copiar-comida-dialog',
  imports: [DialogShellComponent, NsAlertComponent, NsButtonComponent, NsEmptyStateComponent, NsSkeletonComponent],
  template: `
    <ns-dialog-shell>
      @if (cargando()) {
        <div aria-busy="true" aria-label="Cargando comidas">
          @for (i of [1, 2, 3]; track i) {
            <ns-skeleton shape="rect" height="56px" />
          }
        </div>
      } @else if (error(); as error) {
        <ns-alert type="error">
          {{ error }}
          <button nsAlertAcciones nsButton type="button" variant="secondary" size="sm" (click)="cargar()">
            Reintentar
          </button>
        </ns-alert>
      } @else if (comidas().length === 0) {
        <ns-empty-state icon="utensils" titulo="No hay comidas en los últimos 7 días" [nivelTitulo]="3" />
      } @else {
        <ul class="ns-copiar" role="list">
          @for (c of comidas(); track c.id) {
            <li>
              <button type="button" class="ns-copiar__opcion" (click)="ref.close(c)">
                <span class="ns-copiar__textos">
                  <span class="ns-copiar__titulo"
                    >{{ tipo(c) }} · {{ fecha(c.fecha) }}{{ c.hora ? ', ' + c.hora.slice(0, 5) : '' }}</span
                  >
                  <span class="ns-copiar__alimentos">{{ nombres(c) }}</span>
                </span>
                <span class="ns-copiar__kcal ns-tnum">{{ kcal(c) }} kcal</span>
              </button>
            </li>
          }
        </ul>
      }
      <button nsDialogAcciones nsButton type="button" variant="secondary" (click)="ref.close()">Cancelar</button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-copiar {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-copiar__opcion {
      display: flex;
      align-items: center;
      gap: var(--ns-space-3);
      width: 100%;
      min-height: 56px;
      padding: var(--ns-space-3);
      border: 1px solid var(--ns-border);
      border-radius: var(--ns-radius-md);
      background: var(--ns-surface);
      color: var(--ns-text);
      font: inherit;
      text-align: left;
      cursor: pointer;
      &:hover {
        background: var(--ns-surface-muted);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
    }
    .ns-copiar__textos {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-width: 0;
    }
    .ns-copiar__titulo {
      font-weight: 600;
    }
    .ns-copiar__alimentos {
      overflow: hidden;
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ns-copiar__kcal {
      flex-shrink: 0;
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopiarComidaDialogComponent {
  protected readonly ref = inject<DialogRef<RegistroComidaResponse>>(DialogRef);
  private readonly comidasService = inject(ComidasService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  private readonly dias = signal<ComidasDiaResponse[]>([]);

  /** Todas las comidas de los 7 días, de la más reciente a la más antigua. */
  protected readonly comidas = computed(() =>
    this.dias()
      .flatMap((d) => d.comidas)
      .sort((a, b) => `${b.fecha} ${b.hora ?? ''}`.localeCompare(`${a.fecha} ${a.hora ?? ''}`)),
  );

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    const hoy = hoyLocal();
    this.cargando.set(true);
    this.error.set(null);
    this.comidasService.historial(sumarDias(hoy, -(DIAS_COPIAR - 1)), hoy).subscribe({
      next: (dias) => {
        this.dias.set(dias);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(aApiError(e).detalle);
        this.cargando.set(false);
      },
    });
  }

  protected tipo(c: RegistroComidaResponse): string {
    return c.tipoComida ? ETIQUETAS_TIPO_COMIDA[c.tipoComida] : 'Comida';
  }

  protected fecha(f: string): string {
    return formatearFecha(f, 'diaMes');
  }

  protected kcal(c: RegistroComidaResponse): string {
    return formatearNumero(c.totales.kcal);
  }

  protected nombres(c: RegistroComidaResponse): string {
    return c.alimentos.map((a) => a.nombre).join(', ');
  }
}
