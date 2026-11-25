import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

import type { ApiError } from './api-error';

/**
 * Convierte la ruta de un campo del backend en la ruta de Angular:
 * "alimentos[0].cantidad" → ['alimentos', 0, 'cantidad']; "direccion.calle" → ['direccion', 'calle'].
 */
export function rutaDeCampo(campo: string): (string | number)[] {
  return campo
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .map((parte) => (/^\d+$/.test(parte) ? Number(parte) : parte));
}

/**
 * Asigna los errores de campo de un 400 VALIDACION (NutriSport_API.md §3.1) a los controles del
 * formulario: setErrors({ servidor: mensaje }) y markAsTouched(), para que ns-form-field y
 * nsErrorCampo los muestren. Si un campo trae varios mensajes, se unen.
 *
 * Devuelve true si asignó alguno. Si es false, el error no era de ningún campo del formulario y
 * hay que mostrar `error.detalle` en un ns-alert.
 *
 *   const error = aApiError(e);
 *   if (!aplicarErroresServidor(this.form, error)) this.aviso.set(error.detalle);
 *
 * El error 'servidor' desaparece solo: en cuanto el usuario cambia el valor, los validadores se
 * vuelven a ejecutar y sustituyen los errores del control.
 */
export function aplicarErroresServidor(form: FormGroup | FormArray, error: ApiError): boolean {
  const mensajesPorCampo = new Map<string, string[]>();
  for (const { campo, mensaje } of error.errores) {
    mensajesPorCampo.set(campo, [...(mensajesPorCampo.get(campo) ?? []), mensaje]);
  }

  let asignados = 0;
  for (const [campo, mensajes] of mensajesPorCampo) {
    const control = form.get(rutaDeCampo(campo));
    if (!control) continue;
    control.setErrors({ servidor: mensajes.join(' ') });
    control.markAsTouched();
    asignados++;
  }
  return asignados > 0;
}

/**
 * Marca como tocados todos los controles (también los anidados) para que se vean sus errores.
 * Úsalo al enviar un formulario inválido (DESIGN.md §5.3: validación al perder el foco y al
 * enviar).
 *
 *   if (this.form.invalid) { marcarTodoTocado(this.form); return; }
 */
export function marcarTodoTocado(form: AbstractControl): void {
  form.markAllAsTouched();
}
