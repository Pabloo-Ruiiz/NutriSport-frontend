import { ChangeDetectionStrategy, Component, computed, forwardRef, input } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { NsControlCampo, idUnico } from './control-campo';
import { NsControlValor } from './control-valor';

/**
 * Interruptor de encendido/apagado (DESIGN.md §5.4): 36 × 20, activo en green-700.
 * Es un <button role="switch"> con aria-checked; el texto proyectado es su etiqueta.
 *
 *   <ns-switch formControlName="recordatorios">Recordatorios de comidas</ns-switch>
 */
@Component({
  selector: 'ns-switch',
  template: `
    <button
      type="button"
      role="switch"
      class="ns-switch__pista"
      [id]="idControl()"
      [attr.aria-checked]="!!valor()"
      [disabled]="deshabilitado()"
      [attr.aria-describedby]="describedBy()"
      (click)="emitir(!valor())"
      (blur)="tocar()"
    >
      <span class="ns-switch__thumb"></span>
    </button>
    <label class="ns-switch__texto" [for]="idControl()"><ng-content /></label>
  `,
  styleUrl: './switch.component.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NsSwitchComponent), multi: true },
    { provide: NsControlCampo, useExisting: forwardRef(() => NsSwitchComponent) },
  ],
  host: { class: 'ns-switch', '[class.ns-switch--deshabilitado]': 'deshabilitado()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsSwitchComponent extends NsControlValor<boolean> {
  readonly id = input<string>();

  readonly etiquetable = true;
  private readonly idGenerado = idUnico('ns-switch');
  readonly idControl = computed(() => this.id() || this.idGenerado);
}
