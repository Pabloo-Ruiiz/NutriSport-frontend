import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { FuenteAlimento, OrigenReceta } from '@core/models';
import { ETIQUETAS_FUENTE_ALIMENTO, ETIQUETAS_ORIGEN_RECETA } from '@core/models/etiquetas';
import { NsBadgeComponent } from '../feedback/badge.component';

export type NsFuenteDato = FuenteAlimento | OrigenReceta;

/** Texto de cada fuente: de un alimento o de una receta (los valores no se solapan). */
const ETIQUETAS: Record<NsFuenteDato, string> = { ...ETIQUETAS_FUENTE_ALIMENTO, ...ETIQUETAS_ORIGEN_RECETA };

/** Icono de cada fuente (DESIGN.md §5.16). Nunca índigo: no es IA. */
const ICONOS: Record<NsFuenteDato, string> = {
  BEDCA: 'database',
  USDA: 'database',
  OPEN_FOOD_FACTS: 'scan-barcode',
  ADMIN: 'shield-check',
  USUARIO: 'user',
  OCR: 'camera',
  PROPIA: 'database',
  THEMEALDB: 'utensils',
};

/**
 * Procedencia de un alimento o de una receta (DESIGN.md §5.16): badge neutral con icono y texto
 * —"BEDCA", "USDA", "Open Food Facts", "NutriSport", "Propio", "TheMealDB"—, para separar lo
 * verificado de lo creado por el usuario o importado.
 *
 *   <ns-source-badge [fuente]="alimento.fuente" />
 *   <ns-source-badge [fuente]="receta.origen" />
 */
@Component({
  selector: 'ns-source-badge',
  imports: [NsBadgeComponent],
  template: `<ns-badge [icon]="icono()" [attr.title]="'Fuente: ' + etiqueta()"
    ><span class="ns-sr-only">Fuente: </span>{{ etiqueta() }}</ns-badge
  >`,
  styles: `
    :host {
      display: inline-flex;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsSourceBadgeComponent {
  readonly fuente = input.required<NsFuenteDato>();
  protected readonly etiqueta = computed(() => ETIQUETAS[this.fuente()] ?? this.fuente());
  protected readonly icono = computed(() => ICONOS[this.fuente()] ?? 'database');
}
