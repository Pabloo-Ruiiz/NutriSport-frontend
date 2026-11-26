import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import type { Alergeno } from '@core/models';
import { ETIQUETAS_ALERGENO } from '@core/models/etiquetas';
import { NsBadgeComponent } from '../feedback/badge.component';

/**
 * Alérgenos de un alimento o producto (DESIGN.md §5.16): "Contiene" y "Puede contener" (trazas).
 * Los de "Contiene" que chocan con una restricción del usuario van en warning con icono. Si los
 * alérgenos no están revisados, lo dice.
 *
 *   <ns-allergen-list [contiene]="a.alergenosContiene" [trazas]="a.alergenosTrazas"
 *                     [revisados]="a.alergenosRevisados" [restringidos]="misAlergias" />
 */
@Component({
  selector: 'ns-allergen-list',
  imports: [LucideDynamicIcon, NsBadgeComponent],
  template: `
    @if (contiene().length) {
      <div class="ns-al__grupo">
        <p class="ns-al__titulo">Contiene</p>
        <ul class="ns-al__lista" role="list">
          @for (a of contieneConEstado(); track a.alergeno) {
            <li>
              @if (a.restringido) {
                <ns-badge variant="warning" icon="triangle-exclamation-point"
                  >{{ a.nombre }}<span class="ns-sr-only"> (está en tus restricciones)</span></ns-badge
                >
              } @else {
                <ns-badge>{{ a.nombre }}</ns-badge>
              }
            </li>
          }
        </ul>
      </div>
    }
    @if (trazas().length) {
      <div class="ns-al__grupo">
        <p class="ns-al__titulo">Puede contener</p>
        <ul class="ns-al__lista" role="list">
          @for (a of trazas(); track a) {
            <li>
              <ns-badge>{{ nombre(a) }}</ns-badge>
            </li>
          }
        </ul>
      </div>
    }
    @if (!contiene().length && !trazas().length) {
      <p class="ns-al__vacio">Sin alérgenos declarados.</p>
    }
    @if (!revisados()) {
      <p class="ns-al__nota">
        <svg lucideIcon="info" [size]="14" aria-hidden="true"></svg>
        Alérgenos sin revisar: datos de la fuente, sin revisar por NutriSport.
      </p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
    }
    .ns-al__grupo {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
    }
    .ns-al__titulo,
    .ns-al__vacio,
    .ns-al__nota {
      margin: 0;
      font-size: 0.8125rem;
    }
    .ns-al__titulo {
      font-weight: 600;
    }
    .ns-al__vacio {
      color: var(--ns-text-secondary);
    }
    .ns-al__lista {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-al__nota {
      display: flex;
      align-items: flex-start;
      gap: var(--ns-space-1);
      color: var(--ns-warning);
      font-weight: 500;
      svg {
        flex-shrink: 0;
        margin-top: 2px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsAllergenListComponent {
  readonly contiene = input<readonly Alergeno[]>([]);
  readonly trazas = input<readonly Alergeno[]>([]);
  readonly revisados = input(true);
  /** Alérgenos que el usuario tiene como restricción: se destacan en "Contiene". */
  readonly restringidos = input<readonly Alergeno[]>([]);

  protected readonly contieneConEstado = computed(() => {
    const restringidos = new Set(this.restringidos());
    return this.contiene().map((alergeno) => ({
      alergeno,
      nombre: this.nombre(alergeno),
      restringido: restringidos.has(alergeno),
    }));
  });

  protected nombre(alergeno: Alergeno): string {
    return ETIQUETAS_ALERGENO[alergeno] ?? alergeno;
  }
}
