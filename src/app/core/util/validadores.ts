import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Longitud de la contraseña (NutriSport_API.md §8, RegistroRequest.password). */
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 72;

/** Por qué una contraseña no cumple las reglas, en el orden en que se comprueban. */
export type MotivoContrasena = 'corta' | 'larga' | 'sinLetra' | 'sinNumero';

const LETRA = /\p{L}/u;
const NUMERO = /\p{Nd}/u;

/**
 * Primer motivo por el que la contraseña no cumple las reglas del registro, o null si las cumple.
 * La lista de contraseñas comunes solo la comprueba el servidor.
 */
export function motivoContrasena(valor: string): MotivoContrasena | null {
  if (valor.length < PASSWORD_MIN) return 'corta';
  if (valor.length > PASSWORD_MAX) return 'larga';
  if (!LETRA.test(valor)) return 'sinLetra';
  if (!NUMERO.test(valor)) return 'sinNumero';
  return null;
}

/**
 * Contraseña del registro, del restablecimiento y del cambio de contraseña: 10–72 caracteres, al
 * menos una letra y un número. Error: { contrasenaSegura: { motivo } }.
 * Un valor vacío es válido: para exigirlo, añade Validators.required.
 */
export function contrasenaSegura(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    if (typeof valor !== 'string' || valor === '') return null;
    const motivo = motivoContrasena(valor);
    return motivo ? { contrasenaSegura: { motivo } } : null;
  };
}

/**
 * El valor tiene que ser igual al de otro control (confirmar la contraseña).
 * Error: { coincideCon: true }. Un valor vacío es válido (lo cubre Validators.required).
 *
 * Acepta el control o una función que lo devuelva (si el control aún no existe al crear el
 * validador). Lo más sencillo es declarar antes el control de referencia:
 *
 *   private readonly password = new FormControl('', [Validators.required, contrasenaSegura()]);
 *   form = new FormGroup({
 *     password: this.password,
 *     confirmar: new FormControl('', [Validators.required, coincideCon(this.password)]),
 *   });
 *
 * El validador solo se ejecuta cuando cambia su propio control: si cambia el otro, hay que volver
 * a validarlo (p. ej. password.valueChanges → confirmar.updateValueAndValidity()).
 */
export function coincideCon(otro: AbstractControl | (() => AbstractControl | null | undefined)): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const referencia = typeof otro === 'function' ? otro() : otro;
    if (!referencia || control.value === null || control.value === undefined || control.value === '') return null;
    return control.value === referencia.value ? null : { coincideCon: true };
  };
}

/**
 * Un texto no puede ser solo espacios (nombre de la cuenta, títulos…). Error: { noSoloEspacios: true }.
 * Un valor vacío es válido (lo cubre Validators.required).
 */
export function noSoloEspacios(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    return typeof valor === 'string' && valor.length > 0 && valor.trim() === '' ? { noSoloEspacios: true } : null;
  };
}

/**
 * Casilla obligatoria (mayoría de edad, términos, consentimiento). Validators.requiredTrue
 * devuelve { required: true }, cuyo mensaje es "Este campo es obligatorio."; este devuelve
 * { requiredTrue: true }: "Debes marcar esta casilla para continuar.".
 */
export function casillaMarcada(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value === true ? null : { requiredTrue: true };
}

const FECHA_API = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Años cumplidos el día `hoy` por quien nació en `nacimiento` (ambas "AAAA-MM-DD"). null si no es una fecha. */
export function edadEn(nacimiento: string, hoy: string): number | null {
  const n = FECHA_API.exec(nacimiento);
  const h = FECHA_API.exec(hoy);
  if (!n || !h) return null;
  const [anio, mes, dia] = [Number(n[1]), Number(n[2]), Number(n[3])];
  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return null;
  let edad = Number(h[1]) - anio;
  if (Number(h[2]) < mes || (Number(h[2]) === mes && Number(h[3]) < dia)) edad--;
  return edad;
}

/**
 * Fecha de nacimiento ("AAAA-MM-DD", la de <input type="date">) de alguien con al menos `anios`.
 * Errores: { fechaNoValida: true } o { edadMinima: { minima, actual } }. Vacío es válido.
 * `hoy` se puede fijar en las pruebas.
 */
export function edadMinima(anios: number, hoy: () => string = hoyLocalApi): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    if (valor === null || valor === undefined || valor === '') return null;
    const edad = typeof valor === 'string' ? edadEn(valor, hoy()) : null;
    if (edad === null || edad < 0 || edad > 120) return { fechaNoValida: true };
    return edad < anios ? { edadMinima: { minima: anios, actual: edad } } : null;
  };
}

function hoyLocalApi(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Fecha "AAAA-MM-DD" que no es posterior a hoy (pesajes, comidas ya hechas). Errores:
 * { fechaNoValida: true } o { fechaFutura: true }. Vacío es válido. `hoy` se puede fijar en las pruebas.
 */
export function fechaNoFutura(hoy: () => string = hoyLocalApi): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    if (valor === null || valor === undefined || valor === '') return null;
    if (typeof valor !== 'string' || edadEn(valor, valor) === null) return { fechaNoValida: true };
    // "AAAA-MM-DD" se compara bien como texto.
    return valor > hoy() ? { fechaFutura: true } : null;
  };
}
