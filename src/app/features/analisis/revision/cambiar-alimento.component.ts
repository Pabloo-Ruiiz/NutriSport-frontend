import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import type { AlimentoResumenResponse, CoincidenciaCatalogo } from '@core/models';
import { idUnico } from '@shared/ui/form/control-campo';
import { BuscadorAlimentosComponent } from '../../alimentos/buscador-alimentos.component';

/**
 * "Cambiar alimento" de una línea del análisis (DESIGN.md §7.8): las coincidencias del candidato
 * con su similitud (la elegida marcada) y el buscador del catálogo para elegir otro. Las
 * coincidencias sin alimentoId no se pueden confirmar y salen desactivadas.
 */
@Component({
  selector: 'app-cambiar-alimento',
  imports: [LucideDynamicIcon, BuscadorAlimentosComponent],
  template: `
    @if (coincidencias().length) {
      <p class="ns-cambiar__titulo" [id]="idTitulo">¿No es correcto? Otras coincidencias</p>
      <ul class="ns-cambiar__opciones" [attr.aria-labelledby]="idTitulo">
        @for (c of coincidencias(); track $index) {
          <li>
            <button
              type="button"
              class="ns-cambiar__opcion"
              [class.ns-cambiar__opcion--elegida]="!!c.alimentoId && c.alimentoId === alimentoIdActual()"
              [attr.aria-pressed]="!!c.alimentoId && c.alimentoId === alimentoIdActual()"
              [disabled]="!c.alimentoId"
              [attr.title]="c.alimentoId ? null : 'No está en el catálogo'"
              (click)="elegido.emit(c)"
            >
              @if (c.alimentoId && c.alimentoId === alimentoIdActual()) {
                <svg lucideIcon="check" [size]="14" aria-hidden="true"></svg>
              }
              {{ c.nombre }}
              <span class="ns-cambiar__similitud">{{ porcentaje(c.similitud) }}</span>
            </button>
          </li>
        }
      </ul>
    }
    <app-buscador-alimentos modo="combobox" [etiqueta]="etiquetaBuscador()" (elegido)="elegido.emit($event)" />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
      padding: var(--ns-space-4);
      border: 1px solid var(--ns-border);
      border-radius: var(--ns-radius-lg);
      background: var(--ns-surface);
    }
    .ns-cambiar__titulo {
      margin: 0;
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
    }
    .ns-cambiar__opciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-cambiar__opcion {
      display: inline-flex;
      align-items: center;
      gap: var(--ns-space-1);
      min-height: 36px;
      padding: 0 var(--ns-space-3);
      border: 1px solid var(--ns-border-strong);
      border-radius: var(--ns-radius-full);
      background: var(--ns-surface);
      color: var(--ns-text);
      font: inherit;
      font-size: 0.8125rem;
      cursor: pointer;

      &:hover:not(:disabled) {
        background: var(--ns-surface-muted);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
      &:disabled {
        color: var(--ns-text-tertiary);
        cursor: not-allowed;
      }
    }
    .ns-cambiar__opcion--elegida {
      border-color: var(--ns-action-primary);
      background: var(--ns-success-bg);
      color: var(--ns-text-link);
      font-weight: 600;
    }
    .ns-cambiar__similitud {
      color: var(--ns-text-tertiary);
      font-variant-numeric: tabular-nums;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CambiarAlimentoComponent {
  readonly coincidencias = input<readonly CoincidenciaCatalogo[]>([]);
  readonly alimentoIdActual = input<string | null>(null);
  /** Nombre del alimento detectado, para la etiqueta del buscador. */
  readonly nombre = input<string | null>(null);

  readonly elegido = output<CoincidenciaCatalogo | AlimentoResumenResponse>();

  protected readonly idTitulo = idUnico('ns-cambiar');
  protected readonly etiquetaBuscador = computed(() =>
    this.nombre() ? `Buscar otro alimento para ${this.nombre()}` : 'Buscar otro alimento',
  );

  protected porcentaje(similitud: number): string {
    return `${Math.round(similitud * 100)} %`;
  }
}
