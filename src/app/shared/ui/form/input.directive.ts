import { Directive, DoCheck, booleanAttribute, computed, forwardRef, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';

import { EstadoControl, NsControlCampo, idUnico } from './control-campo';

/**
 * Campo de texto del sistema de diseño (DESIGN.md §5.2). Se usa dentro de ns-form-field, que es
 * quien carga los estilos de .ns-input:
 *
 *   <ns-form-field label="Peso" sufijo="kg" obligatorio>
 *     <input nsInput type="number" formControlName="peso" />
 *   </ns-form-field>
 *
 * Pinta el estado de error (clase y aria-invalid) cuando el control es inválido y está tocado, y
 * el aria-describedby con la ayuda y el error que registra el campo.
 *
 * Para un error que no es del control (p. ej. una fecha validada a mano), no pongas
 * aria-describedby ni aria-invalid en el <input>: la directiva los pinta y los pisaría. Usa
 * `descritoPor` (ids extra, se suman a los del campo) e `invalido`:
 *
 *   <input nsInput type="date" [invalido]="!!errorFecha()" descritoPor="error-fecha" … />
 */
@Directive({
  selector: 'input[nsInput], textarea[nsInput]',
  providers: [{ provide: NsControlCampo, useExisting: forwardRef(() => NsInputDirective) }],
  host: {
    class: 'ns-input',
    '[id]': 'idControl()',
    '[class.ns-input--error]': 'mostrarError()',
    '[attr.aria-invalid]': 'mostrarError() || null',
    '[attr.aria-describedby]': 'ariaDescritoPor()',
  },
})
export class NsInputDirective extends NsControlCampo implements DoCheck {
  /** Id propio; si no se indica, se genera uno. */
  readonly id = input<string>();

  readonly etiquetable = true;
  private readonly idGenerado = idUnico('ns-input');
  readonly idControl = computed(() => this.id() || this.idGenerado);

  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly estado = new EstadoControl();
  protected readonly conError = this.estado.mostrarError;

  /** Ids extra para aria-describedby (separados por espacios), además de la ayuda y el error del campo. */
  readonly descritoPor = input<string | null | undefined>(null);
  /** Marca el campo como inválido por un error que no es del control. */
  readonly invalido = input(false, { transform: booleanAttribute });

  protected readonly mostrarError = computed(() => this.conError() || this.invalido());
  protected readonly ariaDescritoPor = computed(
    () => [this.describedBy(), this.descritoPor()].filter((id) => !!id).join(' ') || null,
  );

  ngDoCheck(): void {
    // NgControl crea su control en ngOnChanges; aquí ya existe (y se detecta si cambia).
    this.estado.sincronizar(this.ngControl?.control);
  }
}
