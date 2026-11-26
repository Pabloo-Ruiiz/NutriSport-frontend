import { ChangeDetectionStrategy, Component, booleanAttribute, computed, forwardRef, input } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { NsControlCampo, idUnico } from './control-campo';
import { NsControlValor } from './control-valor';

/**
 * Casilla de verificación (DESIGN.md §5.4): 18 px, marcada en green-700. El texto se proyecta.
 *
 *   <ns-checkbox formControlName="aceptaTerminos">Acepto las condiciones de uso</ns-checkbox>
 *
 * Usa un <input type="checkbox"> nativo (invisible) encima de la caja dibujada, así que el teclado
 * y los lectores de pantalla funcionan como en cualquier casilla.
 *
 * `indeterminado` dibuja un guion y anuncia "mixto" (p. ej. "seleccionar todo" con solo algunas
 * filas marcadas). Al pulsarla, el navegador la desmarca como indeterminada y emite su `checked`.
 */
@Component({
  selector: 'ns-checkbox',
  imports: [LucideDynamicIcon],
  template: `
    <label class="ns-checkbox__fila">
      <span class="ns-checkbox__caja">
        <input
          type="checkbox"
          class="ns-checkbox__nativo"
          [id]="idControl()"
          [checked]="!!valor()"
          [indeterminate]="indeterminado()"
          [disabled]="deshabilitado()"
          [attr.aria-describedby]="describedBy()"
          (change)="alCambiar($event)"
          (blur)="tocar()"
        />
        @if (indeterminado()) {
          <svg class="ns-checkbox__check" lucideIcon="minus" [size]="14" [strokeWidth]="3" aria-hidden="true"></svg>
        } @else {
          <svg class="ns-checkbox__check" lucideIcon="check" [size]="14" [strokeWidth]="3" aria-hidden="true"></svg>
        }
      </span>
      <span class="ns-checkbox__texto"><ng-content /></span>
    </label>
  `,
  styleUrl: './checkbox.component.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NsCheckboxComponent), multi: true },
    { provide: NsControlCampo, useExisting: forwardRef(() => NsCheckboxComponent) },
  ],
  host: { class: 'ns-checkbox', '[class.ns-checkbox--deshabilitado]': 'deshabilitado()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsCheckboxComponent extends NsControlValor<boolean> {
  readonly id = input<string>();
  readonly indeterminado = input(false, { transform: booleanAttribute });

  readonly etiquetable = true;
  private readonly idGenerado = idUnico('ns-checkbox');
  readonly idControl = computed(() => this.id() || this.idGenerado);

  protected alCambiar(evento: Event): void {
    this.emitir((evento.target as HTMLInputElement).checked);
  }
}
