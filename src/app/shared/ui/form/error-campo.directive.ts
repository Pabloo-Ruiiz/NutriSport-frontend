import { Directive, computed, effect, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

import { EstadoControl, NsControlCampo, idUnico } from './control-campo';
import { primerMensajeError } from './mensajes-error';

/**
 * Muestra el primer error de un control en castellano (mensajes-error.ts) y enlaza su id con el
 * aria-describedby del control mientras está visible.
 *
 * Se ve cuando el control es inválido y está tocado, o cuando tiene el error 'servidor' (el texto
 * que devuelve el backend: control.setErrors({ servidor: 'Ya existe una cuenta con este correo' })).
 *
 * Dentro de ns-form-field no hace falta: el campo ya lo incluye. Fuera de él:
 *
 *   <input id="email" formControlName="email" #email />
 *   <p [nsErrorCampo]="form.controls.email" [nsErrorCampoPara]="email"></p>
 *
 * `nsErrorCampoPara` acepta el elemento enfocable o un control del sistema (nsInput, ns-select…).
 */
@Directive({
  selector: '[nsErrorCampo]',
  exportAs: 'nsErrorCampo',
  host: {
    class: 'ns-error-campo',
    '[id]': 'id',
    '[hidden]': '!visible()',
    '[textContent]': 'mensaje()',
  },
})
export class ErrorCampoDirective {
  readonly nsErrorCampo = input<AbstractControl | null | undefined>(null);
  /** Control al que describe el mensaje (recibe aria-describedby). */
  readonly nsErrorCampoPara = input<NsControlCampo | HTMLElement | null>();

  readonly id = idUnico('ns-error');

  private readonly estado = new EstadoControl(() => this.nsErrorCampo());

  readonly visible = this.estado.mostrarError;
  readonly mensaje = computed(() => (this.visible() ? primerMensajeError(this.estado.errores()) : null) ?? '');

  constructor() {
    effect((alLimpiar) => {
      const destino = this.nsErrorCampoPara();
      if (!destino || !this.visible()) return;

      if (destino instanceof NsControlCampo) {
        destino.anadirDescripcion(this.id);
        alLimpiar(() => destino.quitarDescripcion(this.id));
      } else {
        anadirToken(destino, 'aria-describedby', this.id);
        destino.setAttribute('aria-invalid', 'true');
        alLimpiar(() => {
          quitarToken(destino, 'aria-describedby', this.id);
          destino.removeAttribute('aria-invalid');
        });
      }
    });
  }
}

function anadirToken(elemento: HTMLElement, atributo: string, token: string): void {
  const tokens = (elemento.getAttribute(atributo) ?? '').split(/\s+/).filter(Boolean);
  if (!tokens.includes(token)) elemento.setAttribute(atributo, [...tokens, token].join(' '));
}

function quitarToken(elemento: HTMLElement, atributo: string, token: string): void {
  const tokens = (elemento.getAttribute(atributo) ?? '').split(/\s+/).filter((t) => t && t !== token);
  if (tokens.length) elemento.setAttribute(atributo, tokens.join(' '));
  else elemento.removeAttribute(atributo);
}
