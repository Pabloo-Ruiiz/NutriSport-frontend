import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import type { EntrenamientoRequest, EntrenamientoResponse, EstadoEntrenamiento, Intensidad } from '@core/models';
import { desdeFechaApi } from '@core/util/fechas';

/** Límites de EntrenamientoRequest (NutriSport_API.md §8). */
export const DURACION_MIN = 1;
export const DURACION_MAX = 600;
export const DISTANCIA_MAX = 9999.99;
export const NOTAS_MAX = 500;
export const RPE_MIN = 1;
export const RPE_MAX = 10;

/** Valor de un <input type="datetime-local">: "AAAA-MM-DDTHH:mm" (hora local, sin zona). */
const PATRON_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export interface ValorEntrenamiento {
  tipoActividadCodigo: string | null;
  fechaHora: string; // "AAAA-MM-DDTHH:mm"
  duracionMin: number | null;
  intensidad: Intensidad;
  estado: EstadoEntrenamiento;
  rpe: number | null;
  distanciaKm: number | null;
  notas: string;
}

export type FormularioEntrenamiento = FormGroup<{
  tipoActividadCodigo: FormControl<string | null>;
  fechaHora: FormControl<string>;
  duracionMin: FormControl<number | null>;
  intensidad: FormControl<Intensidad>;
  estado: FormControl<EstadoEntrenamiento>;
  rpe: FormControl<number | null>;
  distanciaKm: FormControl<number | null>;
  notas: FormControl<string>;
}>;

function rellenar(n: number, digitos = 2): string {
  return String(Math.abs(n)).padStart(digitos, '0');
}

/** Date → "AAAA-MM-DDTHH:mm" con sus componentes locales. */
export function aFechaHoraLocal(d: Date): string {
  return `${rellenar(d.getFullYear(), 4)}-${rellenar(d.getMonth() + 1)}-${rellenar(d.getDate())}T${rellenar(d.getHours())}:${rellenar(d.getMinutes())}`;
}

/** "AAAA-MM-DDTHH:mm" → Date local, o null si no es válido (p. ej. 2026-02-30). */
export function desdeFechaHoraLocal(local: string): Date | null {
  const m = PATRON_LOCAL.exec(local);
  if (!m) return null;
  const [anio, mes, dia, hora, minuto] = m.slice(1, 6).map(Number);
  const d = new Date(anio, mes - 1, dia, hora, minuto, 0, 0);
  if (d.getFullYear() !== anio || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return d;
}

/** Desfase de una zona en minutos (como Date.getTimezoneOffset: Madrid en invierno, -60) → "+01:00". */
export function formatearDesfase(minutosOffset: number): string {
  const total = -minutosOffset;
  const signo = total >= 0 ? '+' : '-';
  return `${signo}${rellenar(Math.trunc(Math.abs(total) / 60))}:${rellenar(Math.abs(total) % 60)}`;
}

/**
 * "2026-11-25T18:30" (hora local) → "2026-11-25T18:30:00+01:00": ISO con el desfase de la zona
 * local EN ESA FECHA (tiene en cuenta el horario de verano). Si la hora no existe por el cambio de
 * hora (02:30 del último domingo de marzo en Madrid), se usa la que da el navegador (03:30).
 * Null si el valor no es válido.
 *
 * `desfase` permite fijar la zona en las pruebas; por defecto, la del navegador.
 */
export function aIsoConZona(local: string, desfase: (d: Date) => number = (d) => d.getTimezoneOffset()): string | null {
  const d = desdeFechaHoraLocal(local);
  if (!d) return null;
  return `${aFechaHoraLocal(d)}:00${formatearDesfase(desfase(d))}`;
}

/** ISO con zona de la API → "AAAA-MM-DDTHH:mm" en la hora local del navegador (para el input). */
export function isoAFechaHoraLocal(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : aFechaHoraLocal(d);
}

/** true si la fecha y hora local es posterior a `ahora` (un entrenamiento futuro no puede estar REALIZADO). */
export function esFutura(local: string, ahora: Date = new Date()): boolean {
  const d = desdeFechaHoraLocal(local);
  return d !== null && d.getTime() > ahora.getTime();
}

/** Valor inicial: el del entrenamiento que se edita, o uno nuevo para `fecha` (por defecto, ahora). */
export function valorInicial(
  entrenamiento?: EntrenamientoResponse | null,
  fecha?: string | null,
  ahora: Date = new Date(),
): ValorEntrenamiento {
  if (entrenamiento) {
    return {
      tipoActividadCodigo: entrenamiento.tipoActividadCodigo,
      fechaHora: isoAFechaHoraLocal(entrenamiento.fechaHora),
      duracionMin: entrenamiento.duracionMin,
      intensidad: entrenamiento.intensidad,
      estado: entrenamiento.estado,
      rpe: entrenamiento.rpe,
      distanciaKm: entrenamiento.distanciaKm,
      notas: entrenamiento.notas ?? '',
    };
  }
  // Hoy (o sin fecha): ahora, redondeado hacia abajo a 5 min. Otro día: a las 18:00.
  let d = new Date(ahora);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() - (d.getMinutes() % 5));
  if (fecha && fecha !== aFechaHoraLocal(ahora).slice(0, 10)) {
    d = desdeFechaApi(fecha);
    d.setHours(18, 0, 0, 0);
  }
  const fechaHora = aFechaHoraLocal(d);
  return {
    tipoActividadCodigo: null,
    fechaHora,
    duracionMin: 60,
    intensidad: 'MEDIA',
    estado: esFutura(fechaHora, ahora) ? 'PLANIFICADO' : 'REALIZADO',
    rpe: null,
    distanciaKm: null,
    notas: '',
  };
}

/** fechaHora con formato y fecha válidos. */
function fechaHoraValida(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null =>
    !control.value || desdeFechaHoraLocal(control.value) ? null : { fechaHora: true };
}

/** Un entrenamiento futuro no puede estar REALIZADO: error `realizadoFuturo` en el grupo. */
export function realizadoNoFuturo(ahora: () => Date): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const estado = grupo.get('estado')?.value as EstadoEntrenamiento | undefined;
    const fechaHora = grupo.get('fechaHora')?.value as string | undefined;
    return estado === 'REALIZADO' && !!fechaHora && esFutura(fechaHora, ahora()) ? { realizadoFuturo: true } : null;
  };
}

/** Formulario de EntrenamientoRequest (NutriSport_API.md §8). */
export function crearFormularioEntrenamiento(
  valor: ValorEntrenamiento,
  ahora: () => Date = () => new Date(),
): FormularioEntrenamiento {
  return new FormGroup(
    {
      tipoActividadCodigo: new FormControl<string | null>(valor.tipoActividadCodigo, [
        Validators.required,
        Validators.maxLength(40),
      ]),
      fechaHora: new FormControl(valor.fechaHora, {
        nonNullable: true,
        validators: [Validators.required, fechaHoraValida()],
      }),
      duracionMin: new FormControl<number | null>(valor.duracionMin, [
        Validators.required,
        Validators.min(DURACION_MIN),
        Validators.max(DURACION_MAX),
      ]),
      intensidad: new FormControl<Intensidad>(valor.intensidad, { nonNullable: true, validators: Validators.required }),
      estado: new FormControl<EstadoEntrenamiento>(valor.estado, { nonNullable: true }),
      rpe: new FormControl<number | null>(valor.rpe, [Validators.min(RPE_MIN), Validators.max(RPE_MAX)]),
      distanciaKm: new FormControl<number | null>(valor.distanciaKm, [
        Validators.min(0),
        Validators.max(DISTANCIA_MAX),
      ]),
      notas: new FormControl(valor.notas, { nonNullable: true, validators: Validators.maxLength(NOTAS_MAX) }),
    },
    { validators: realizadoNoFuturo(ahora) },
  );
}

/**
 * Valor del formulario → EntrenamientoRequest: fechaHora en ISO con la zona local, el RPE solo si
 * está REALIZADO, la distancia solo si se indica y las notas recortadas (sin ellas si quedan vacías).
 */
export function aEntrenamientoRequest(valor: ValorEntrenamiento, desfase?: (d: Date) => number): EntrenamientoRequest {
  const fechaHora = aIsoConZona(valor.fechaHora, desfase);
  if (!fechaHora) throw new Error(`Fecha y hora no válida: "${valor.fechaHora}"`);
  if (!valor.tipoActividadCodigo || valor.duracionMin === null) throw new Error('Faltan campos obligatorios.');
  const req: EntrenamientoRequest = {
    tipoActividadCodigo: valor.tipoActividadCodigo,
    fechaHora,
    duracionMin: Math.round(valor.duracionMin),
    intensidad: valor.intensidad,
    estado: valor.estado,
  };
  if (valor.estado === 'REALIZADO' && valor.rpe !== null) req.rpe = valor.rpe;
  if (valor.distanciaKm !== null) req.distanciaKm = valor.distanciaKm;
  const notas = valor.notas.trim();
  if (notas) req.notas = notas;
  return req;
}
