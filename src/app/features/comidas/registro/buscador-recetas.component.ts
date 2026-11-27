import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';

import type { RecetaResumenResponse } from '@core/models';
import { RecetasService } from '@core/services/recetas.service';
import { claveReceta, MAX_TEXTO_RECETAS } from '@features/recetas/recetas-url';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsCalcStatusComponent, estadoCalculo } from '@shared/ui/data/calc-status.component';
import { NsSourceBadgeComponent } from '@shared/ui/data/source-badge.component';
import { NsSourcesNoteComponent } from '@shared/ui/data/sources-note.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsSpinnerComponent } from '@shared/ui/feedback/spinner.component';
import { BusquedaReactiva } from '@shared/ui/form/busqueda';
import { NsInputDirective } from '@shared/ui/form/input.directive';

/** Resultados que se muestran por búsqueda. */
const TAMANO = 10;

/**
 * Buscador de recetas para registrarlas como comida (pestaña "Recetas" del registro manual): busca
 * en el catálogo y en TheMealDB mientras se escribe; sin texto, muestra las favoritas. Las recetas
 * con el cálculo incompleto no se pueden elegir (lo dice la fila). Emite la receta elegida; quien
 * lo usa la importa si hace falta y abre RegistrarRecetaDialogComponent.
 */
@Component({
  selector: 'app-buscador-recetas',
  imports: [
    NgTemplateOutlet,
    NsAlertComponent,
    NsButtonComponent,
    NsCalcStatusComponent,
    NsInputDirective,
    NsSourceBadgeComponent,
    NsSourcesNoteComponent,
    NsSpinnerComponent,
  ],
  template: `
    <label class="ns-sr-only" for="ns-buscar-recetas-registro">Buscar receta</label>
    <input
      nsInput
      id="ns-buscar-recetas-registro"
      type="search"
      autocomplete="off"
      placeholder="Buscar receta por nombre"
      [attr.maxlength]="maxTexto"
      [value]="busqueda.texto()"
      (input)="busqueda.escribir($any($event.target).value)"
    />

    <div class="resultados" aria-live="polite">
      @switch (busqueda.estado()) {
        @case ('inactiva') {
          @if (favoritas().length) {
            <h3 class="ns-text-overline ns-text-secondary">Tus favoritas</h3>
            <ng-container *ngTemplateOutlet="lista; context: { $implicit: favoritas() }" />
          } @else {
            <p class="ns-text-body-sm ns-text-secondary">Escribe al menos 2 letras para buscar una receta.</p>
          }
        }
        @case ('cargando') {
          <p class="ns-text-body-sm ns-text-secondary">Buscando recetas…</p>
        }
        @case ('vacia') {
          <p class="ns-text-body-sm ns-text-secondary">No hay recetas con «{{ busqueda.consulta() }}».</p>
        }
        @case ('error') {
          <ns-alert type="error">
            No hemos podido buscar recetas.
            <button
              nsAlertAcciones
              nsButton
              type="button"
              variant="secondary"
              size="sm"
              (click)="busqueda.reintentar()"
            >
              Reintentar
            </button>
          </ns-alert>
        }
        @default {
          <ng-container *ngTemplateOutlet="lista; context: { $implicit: busqueda.resultados() }" />
        }
      }
    </div>

    <ng-template #lista let-recetas>
      <ul class="lista" role="list">
        @for (r of $any(recetas); track clave(r)) {
          @let incompleta = estado(r) === 'INCOMPLETO';
          <li>
            <button
              type="button"
              class="fila"
              [disabled]="incompleta || !!preparando()"
              [attr.aria-busy]="preparando() === clave(r) || null"
              [attr.aria-describedby]="incompleta ? 'ns-receta-incompleta-' + $index : null"
              (click)="elegida.emit(r)"
            >
              <span class="fila__nombre">{{ r.nombre }}</span>
              <span class="fila__meta ns-text-caption ns-text-secondary">
                <ns-source-badge [fuente]="r.origen" />
                {{ cifras(r) }}
              </span>
              @if (preparando() === clave(r)) {
                <ns-spinner class="fila__estado" [size]="18" etiqueta="Preparando la receta" />
              } @else {
                <ns-calc-status class="fila__estado" [estado]="r.estadoNutricional" />
              }
            </button>
            @if (incompleta) {
              <p class="fila__motivo ns-text-caption" [id]="'ns-receta-incompleta-' + $index">
                Cálculo incompleto: no se puede registrar.
              </p>
            }
          </li>
        }
      </ul>
      <ns-sources-note class="atribucion" [fuentes]="origenes($any(recetas))" />
    </ng-template>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
    }
    .resultados h3 {
      margin: 0 0 var(--ns-space-2);
    }
    .resultados p {
      margin: 0;
    }
    .lista {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .fila {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 2px var(--ns-space-2);
      width: 100%;
      min-height: 44px;
      padding: var(--ns-space-3);
      border: 1px solid var(--ns-border);
      border-radius: var(--ns-radius-lg);
      background: var(--ns-surface);
      color: var(--ns-text);
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .fila:hover:not(:disabled) {
      border-color: var(--ns-border-strong);
    }
    .fila:focus-visible {
      outline: 2px solid var(--ns-green-600);
      outline-offset: 2px;
    }
    .fila:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }
    .fila__nombre {
      font-weight: 600;
    }
    .fila__meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ns-space-2);
      grid-column: 1;
    }
    .fila__estado {
      grid-column: 2;
      grid-row: 1 / span 2;
      align-self: center;
    }
    .atribucion {
      margin-top: var(--ns-space-2);
    }
    .fila__motivo {
      margin: var(--ns-space-1) 0 0;
      color: var(--ns-text-secondary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuscadorRecetasComponent {
  private readonly recetas = inject(RecetasService);

  /** Clave (claveReceta) de la receta que se está preparando para el diálogo. */
  readonly preparando = input<string | null>(null);
  readonly elegida = output<RecetaResumenResponse>();

  protected readonly maxTexto = MAX_TEXTO_RECETAS;
  protected readonly clave = claveReceta;
  protected readonly estado = (r: RecetaResumenResponse) => estadoCalculo(r.estadoNutricional);

  protected readonly busqueda = new BusquedaReactiva<RecetaResumenResponse>(
    (q) => this.recetas.buscar({ q, page: 0, size: TAMANO }).pipe(map((b) => [...b.catalogo.content, ...b.themealdb])),
    { debounceMs: () => 400 },
  );

  protected readonly favoritas = toSignal(this.recetas.favoritas().pipe(catchError(() => of([]))), {
    initialValue: [] as RecetaResumenResponse[],
  });

  protected readonly origenes = (recetas: RecetaResumenResponse[]) => recetas.map((r) => r.origen);

  /** "≈ 390 kcal/ración", "Cálculo pendiente" o vacío. */
  protected cifras(r: RecetaResumenResponse): string {
    const estado = estadoCalculo(r.estadoNutricional);
    if (estado === 'PENDIENTE') return 'Se calcula al elegirla';
    const n = r.nutricionRacion;
    if (!n || estado === 'INCOMPLETO') return '';
    return `${estado === 'APROXIMADO' ? '≈ ' : ''}${formatearNumero(n.kcal)} kcal/ración`;
  }
}
