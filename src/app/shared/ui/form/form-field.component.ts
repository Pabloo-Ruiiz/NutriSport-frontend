import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  contentChild,
  effect,
  input,
} from '@angular/core';
import { AbstractControl, NgControl } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import { NsControlCampo, idUnico } from './control-campo';
import { ErrorCampoDirective } from './error-campo.directive';

/**
 * Envoltorio de un campo de formulario (DESIGN.md §5.2 y §5.3): etiqueta, ayuda, sufijo de unidad
 * y el error del control proyectado.
 *
 *   <ns-form-field label="Peso" hint="Pésate por la mañana, en ayunas." sufijo="kg" obligatorio>
 *     <input nsInput type="number" inputmode="decimal" formControlName="peso" />
 *   </ns-form-field>
 *
 * Funciona con cualquier control del sistema (nsInput, ns-select, ns-segmented, ns-chip-group…):
 * enlaza la etiqueta con for/aria-labelledby y la ayuda y el error con aria-describedby.
 *
 * Usa ViewEncapsulation.None porque también da estilo a .ns-input, que es una directiva sobre el
 * <input> proyectado; todas las clases llevan el prefijo BEM ns-form-field / ns-input.
 */
@Component({
  selector: 'ns-form-field',
  imports: [LucideDynamicIcon, ErrorCampoDirective],
  template: `
    <label class="ns-form-field__label" [id]="idEtiqueta" [attr.for]="idParaEtiqueta()">
      {{ label() }}
      @if (sufijo()) {
        <span class="ns-sr-only"> ({{ sufijo() }})</span>
      }
      @if (obligatorio()) {
        <span class="ns-form-field__obligatorio" aria-hidden="true">*</span>
        <span class="ns-sr-only"> (obligatorio)</span>
      }
    </label>

    <div
      class="ns-form-field__control"
      [class.ns-form-field__control--sufijo]="!!sufijo()"
      [style.--ns-sufijo-ch]="sufijo()?.length"
    >
      <ng-content />
      @if (sufijo()) {
        <span class="ns-form-field__sufijo" aria-hidden="true">{{ sufijo() }}</span>
      }
    </div>

    @if (hint()) {
      <p class="ns-form-field__hint" [id]="idAyuda">{{ hint() }}</p>
    }

    <p class="ns-form-field__error" [hidden]="!error.visible()">
      <svg lucideIcon="circle-exclamation-point" [size]="14" aria-hidden="true"></svg>
      <span #error="nsErrorCampo" [nsErrorCampo]="controlActual()" [nsErrorCampoPara]="campo()"></span>
    </p>
  `,
  styleUrl: './form-field.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ns-form-field' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsFormFieldComponent {
  readonly label = input.required<string>();
  readonly hint = input<string>();
  /** Unidad que se muestra dentro del campo, a la derecha (p. ej. "kg", "g", "min"). */
  readonly sufijo = input<string>();
  /** Añade un asterisco visual y "(obligatorio)" para lectores de pantalla. */
  readonly obligatorio = input(false, { transform: booleanAttribute });

  protected readonly idEtiqueta = idUnico('ns-etiqueta');
  protected readonly idAyuda = idUnico('ns-ayuda');

  /** Control del sistema proyectado (nsInput, ns-select…). */
  protected readonly campo = contentChild(NsControlCampo, { descendants: true });
  /** Directiva de formularios del control proyectado (formControlName, formControl, ngModel). */
  private readonly ngControl = contentChild(NgControl, { descendants: true });

  constructor() {
    effect((alLimpiar) => {
      const campo = this.campo();
      if (!campo) return;
      campo.idEtiqueta.set(this.idEtiqueta);
      alLimpiar(() => campo.idEtiqueta.set(null));
    });

    effect((alLimpiar) => {
      const campo = this.campo();
      if (!campo || !this.hint()) return;
      campo.anadirDescripcion(this.idAyuda);
      alLimpiar(() => campo.quitarDescripcion(this.idAyuda));
    });
  }

  protected idParaEtiqueta(): string | null {
    const campo = this.campo();
    return campo?.etiquetable ? campo.idControl() : null;
  }

  // Método y no computed: NgControl.control no es una signal y puede crearse después.
  protected controlActual(): AbstractControl | null {
    return this.ngControl()?.control ?? null;
  }
}
