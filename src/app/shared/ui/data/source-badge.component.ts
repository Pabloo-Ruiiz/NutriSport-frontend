import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { FuenteAlimento } from '@core/models';
import { ETIQUETAS_FUENTE_ALIMENTO } from '@core/models/etiquetas';
import { NsBadgeComponent } from '../feedback/badge.component';

/** Icono de cada fuente (DESIGN.md §5.16). Nunca índigo: no es IA. */
const ICONOS: Record<FuenteAlimento, string> = {
  BEDCA: 'database',
  USDA: 'database',
  OPEN_FOOD_FACTS: 'scan-barcode',
  ADMIN: 'shield-check',
  USUARIO: 'user',
  OCR: 'camera',
};

/**
 * Procedencia de un alimento (DESIGN.md §5.16): badge neutral con icono y texto —"BEDCA", "USDA",
 * "Open Food Facts", "NutriSport", "Propio"—, para separar lo verificado de lo creado por el usuario.
 *
 *   <ns-source-badge [fuente]="alimento.fuente" />
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
  readonly fuente = input.required<FuenteAlimento>();
  protected readonly etiqueta = computed(() => ETIQUETAS_FUENTE_ALIMENTO[this.fuente()] ?? this.fuente());
  protected readonly icono = computed(() => ICONOS[this.fuente()] ?? 'database');
}
