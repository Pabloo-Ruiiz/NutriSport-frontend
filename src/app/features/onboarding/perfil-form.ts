import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import type {
  NivelActividad,
  ObjetivoDeportivo,
  PerfilRequest,
  PerfilResponse,
  PreferenciaDto,
  Sexo,
  TipoComida,
  TipoPreferencia,
} from '@core/models';
import type { ApiError } from '@core/util/api-error';
import { rutaDeCampo } from '@core/util/formularios';
import { FRANJAS_ELEGIBLES, franjasPorDefecto } from '@core/util/franjas';
import { edadMinima } from '@core/util/validadores';

/**
 * Formulario del perfil deportivo (onboarding, paso 11; Mi perfil, paso 12), con un FormGroup por
 * paso. Las reglas son las de NutriSport_API.md §8 (PerfilRequest y PreferenciaDto).
 */

export type GrupoSobreTi = FormGroup<{
  fechaNacimiento: FormControl<string>;
  sexo: FormControl<Sexo | null>;
  alturaCm: FormControl<number | null>;
  pesoKg: FormControl<number | null>;
  porcentajeGrasa: FormControl<number | null>;
}>;

export type GrupoDeporte = FormGroup<{
  deportePrincipal: FormControl<string>;
  diasEntrenamientoSemana: FormControl<number | null>;
  duracionMediaMin: FormControl<number | null>;
  nivelActividad: FormControl<NivelActividad | null>;
}>;

export type GrupoObjetivo = FormGroup<{
  objetivo: FormControl<ObjetivoDeportivo | null>;
  fechaCompeticion: FormControl<string>;
}>;

export type GrupoAlimentacion = FormGroup<{
  preferencias: FormControl<PreferenciaDto[]>;
  comidasPorDia: FormControl<number | null>;
  /** Franjas elegidas: exactamente comidasPorDia (validador franjasComida). */
  tiposComida: FormControl<TipoComida[]>;
  tiempoMaxCocinaMin: FormControl<number | null>;
}>;

export type FormularioPerfil = FormGroup<{
  sobreTi: GrupoSobreTi;
  deporte: GrupoDeporte;
  objetivo: GrupoObjetivo;
  alimentacion: GrupoAlimentacion;
}>;

export type ValorFormularioPerfil = ReturnType<FormularioPerfil['getRawValue']>;

/** Pasos del formulario, en orden. */
export const PASOS_PERFIL = ['sobreTi', 'deporte', 'objetivo', 'alimentacion'] as const;
export type PasoPerfil = (typeof PASOS_PERFIL)[number];

/** Máximo de preferencias de PUT /perfil/preferencias. */
export const MAX_PREFERENCIAS = 100;

/**
 * fechaCompeticion es obligatoria si el objetivo (del mismo grupo) es COMPETICION.
 * Error: { required: true }.
 */
export function fechaCompeticionSiCompite(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const objetivo = control.parent?.get('objetivo')?.value;
    return objetivo === 'COMPETICION' && !control.value ? { required: true } : null;
  };
}

export { FRANJAS_ELEGIBLES, franjasPorDefecto };

/**
 * Tantas franjas distintas como comidas al día (lee comidasPorDia del mismo grupo).
 * Error: { franjasComida: { requeridas, elegidas } }.
 */
export function franjasComida(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const requeridas = Number(control.parent?.get('comidasPorDia')?.value);
    if (!Number.isFinite(requeridas) || requeridas <= 0) return null;
    const elegidas = new Set((control.value as TipoComida[] | null) ?? []).size;
    return elegidas === requeridas ? null : { franjasComida: { requeridas, elegidas } };
  };
}

/** Formulario vacío del perfil (comidasPorDia empieza en 4, sin franjas elegidas). */
export function crearFormularioPerfil(): FormularioPerfil {
  const numero = (validadores: ValidatorFn[], valor: number | null = null) =>
    new FormControl<number | null>(valor, validadores);

  const form: FormularioPerfil = new FormGroup({
    sobreTi: new FormGroup({
      fechaNacimiento: new FormControl('', { nonNullable: true, validators: [Validators.required, edadMinima(18)] }),
      sexo: new FormControl<Sexo | null>(null, Validators.required),
      alturaCm: numero([Validators.required, Validators.min(120), Validators.max(230)]),
      pesoKg: numero([Validators.required, Validators.min(30), Validators.max(250)]),
      porcentajeGrasa: numero([Validators.min(3), Validators.max(60)]),
    }),
    deporte: new FormGroup({
      deportePrincipal: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(40)],
      }),
      diasEntrenamientoSemana: numero([Validators.required, Validators.min(0), Validators.max(7)]),
      duracionMediaMin: numero([Validators.required, Validators.min(0), Validators.max(600)]),
      nivelActividad: new FormControl<NivelActividad | null>(null, Validators.required),
    }),
    objetivo: new FormGroup({
      objetivo: new FormControl<ObjetivoDeportivo | null>(null, Validators.required),
      fechaCompeticion: new FormControl('', { nonNullable: true, validators: fechaCompeticionSiCompite() }),
    }),
    alimentacion: new FormGroup({
      preferencias: new FormControl<PreferenciaDto[]>([], {
        nonNullable: true,
        validators: Validators.maxLength(MAX_PREFERENCIAS),
      }),
      comidasPorDia: numero([Validators.required, Validators.min(3), Validators.max(6)], 4),
      tiposComida: new FormControl<TipoComida[]>([], { nonNullable: true, validators: franjasComida() }),
      tiempoMaxCocinaMin: numero([Validators.min(0), Validators.max(600)]),
    }),
  });

  // La fecha de competición depende del objetivo: se revalida cuando cambia. Ambos controles viven
  // lo mismo que el formulario, así que la suscripción no necesita cancelarse.
  const { objetivo, fechaCompeticion } = form.controls.objetivo.controls;
  objetivo.valueChanges.subscribe(() => fechaCompeticion.updateValueAndValidity());
  // Igual con las franjas: su número válido depende de las comidas al día.
  const { comidasPorDia, tiposComida } = form.controls.alimentacion.controls;
  comidasPorDia.valueChanges.subscribe(() => tiposComida.updateValueAndValidity());
  // Al crearse aún no tenía grupo (no podía leer comidasPorDia): se valida ya con él.
  tiposComida.updateValueAndValidity();

  return form;
}

/**
 * Rellena el formulario con el perfil y las preferencias guardados (Mi perfil) y lo deja sin
 * cambios (pristine y sin tocar), para poder detectar después lo que edita el usuario.
 */
export function rellenarFormularioPerfil(
  form: FormularioPerfil,
  perfil: PerfilResponse,
  preferencias: readonly PreferenciaDto[],
): void {
  form.reset({
    sobreTi: {
      fechaNacimiento: perfil.fechaNacimiento,
      sexo: perfil.sexo,
      alturaCm: perfil.alturaCm,
      pesoKg: perfil.pesoKg,
      porcentajeGrasa: perfil.porcentajeGrasa,
    },
    deporte: {
      deportePrincipal: perfil.deportePrincipal,
      diasEntrenamientoSemana: perfil.diasEntrenamientoSemana,
      duracionMediaMin: perfil.duracionMediaMin,
      nivelActividad: perfil.nivelActividad,
    },
    objetivo: { objetivo: perfil.objetivo, fechaCompeticion: perfil.fechaCompeticion ?? '' },
    alimentacion: {
      preferencias: [...preferencias],
      comidasPorDia: perfil.comidasPorDia,
      tiposComida: perfil.tiposComida?.length ? [...perfil.tiposComida] : franjasPorDefecto(perfil.comidasPorDia),
      tiempoMaxCocinaMin: perfil.tiempoMaxCocinaMin,
    },
  });
}

/**
 * PerfilRequest exacto a partir del valor del formulario: solo los campos del contrato, números
 * como number, y los opcionales solo si tienen valor. fechaCompeticion solo con COMPETICION.
 * Se llama con el formulario válido (los obligatorios están rellenos).
 */
export function aPerfilRequest(valor: ValorFormularioPerfil): PerfilRequest {
  const { sobreTi, deporte, objetivo, alimentacion } = valor;
  const peticion: PerfilRequest = {
    fechaNacimiento: sobreTi.fechaNacimiento,
    sexo: sobreTi.sexo!,
    alturaCm: Number(sobreTi.alturaCm),
    pesoKg: Number(sobreTi.pesoKg),
    objetivo: objetivo.objetivo!,
    deportePrincipal: deporte.deportePrincipal.trim(),
    nivelActividad: deporte.nivelActividad!,
    diasEntrenamientoSemana: Number(deporte.diasEntrenamientoSemana),
    duracionMediaMin: Number(deporte.duracionMediaMin),
    comidasPorDia: Number(alimentacion.comidasPorDia),
    tiposComida: FRANJAS_ELEGIBLES.filter((t) => alimentacion.tiposComida.includes(t)),
  };
  if (hayNumero(sobreTi.porcentajeGrasa)) peticion.porcentajeGrasa = Number(sobreTi.porcentajeGrasa);
  if (objetivo.objetivo === 'COMPETICION' && objetivo.fechaCompeticion) {
    peticion.fechaCompeticion = objetivo.fechaCompeticion;
  }
  if (hayNumero(alimentacion.tiempoMaxCocinaMin)) peticion.tiempoMaxCocinaMin = Number(alimentacion.tiempoMaxCocinaMin);
  return peticion;
}

/** Campo que identifica cada tipo de preferencia (PUT /perfil/preferencias), en orden de prioridad. */
const CAMPOS_POR_TIPO: Record<TipoPreferencia, readonly (keyof PreferenciaDto)[]> = {
  ALERGIA: ['alergeno', 'detalle'],
  INTOLERANCIA: ['intolerancia', 'detalle'],
  DIETA: ['dieta'],
  RECHAZO: ['alimentoId', 'categoriaId'],
  FAVORITO: ['alimentoId', 'categoriaId'],
};

/**
 * Lista exacta para PUT /perfil/preferencias: cada preferencia con tipo, severidad y solo el campo
 * que la identifica (alergeno o detalle, intolerancia o detalle, dieta —con su detalle si es
 * PERSONALIZADA—, o alimentoId/categoriaId). Las que no traen ese campo se descartan y las repetidas
 * se envían una vez.
 */
export function aPreferencias(valor: ValorFormularioPerfil): PreferenciaDto[] {
  const vistas = new Set<string>();
  const resultado: PreferenciaDto[] = [];
  for (const p of valor.alimentacion.preferencias) {
    const dto: PreferenciaDto = { tipo: p.tipo, severidad: p.severidad };
    let completo = false;
    for (const campo of CAMPOS_POR_TIPO[p.tipo] ?? []) {
      const dato = typeof p[campo] === 'string' ? (p[campo] as string).trim() : p[campo];
      if (dato) {
        Object.assign(dto, { [campo]: dato });
        completo = true;
        break; // un solo identificador: p. ej. alergeno o detalle, alimentoId o categoriaId
      }
    }
    if (p.tipo === 'DIETA' && p.dieta === 'PERSONALIZADA' && p.detalle?.trim()) dto.detalle = p.detalle.trim();
    const clave = JSON.stringify(dto);
    if (!completo || vistas.has(clave)) continue;
    vistas.add(clave);
    resultado.push(dto);
  }
  return resultado.slice(0, MAX_PREFERENCIAS);
}

/** Paso en el que está cada campo de PerfilRequest (para los errores 400 del servidor). */
const PASO_DE_CAMPO: Record<string, PasoPerfil> = {
  fechaNacimiento: 'sobreTi',
  sexo: 'sobreTi',
  alturaCm: 'sobreTi',
  pesoKg: 'sobreTi',
  porcentajeGrasa: 'sobreTi',
  deportePrincipal: 'deporte',
  diasEntrenamientoSemana: 'deporte',
  duracionMediaMin: 'deporte',
  nivelActividad: 'deporte',
  objetivo: 'objetivo',
  fechaCompeticion: 'objetivo',
  preferencias: 'alimentacion',
  comidasPorDia: 'alimentacion',
  tiposComida: 'alimentacion',
  tiempoMaxCocinaMin: 'alimentacion',
};

/**
 * Asigna los errores de un 400 a los controles de sus pasos ({ servidor: mensaje }, tocados) y
 * devuelve el índice del primer paso con un error, o null si ninguno era de un campo conocido.
 * Los de una preferencia ("preferencias[2].alergeno") van al control `preferencias`.
 */
export function aplicarErroresPerfil(form: FormularioPerfil, error: ApiError): number | null {
  const mensajes = new Map<AbstractControl, string[]>();
  let primerPaso: number | null = null;

  for (const { campo, mensaje } of error.errores) {
    const raiz = String(rutaDeCampo(campo)[0] ?? '');
    const paso = PASO_DE_CAMPO[raiz];
    if (!paso) continue;
    const control = (form.controls[paso] as FormGroup).get(raiz);
    if (!control) continue;
    mensajes.set(control, [...(mensajes.get(control) ?? []), mensaje]);
    const indice = PASOS_PERFIL.indexOf(paso);
    primerPaso = primerPaso === null ? indice : Math.min(primerPaso, indice);
  }

  for (const [control, textos] of mensajes) {
    control.setErrors({ servidor: textos.join(' ') });
    control.markAsTouched();
  }
  return primerPaso;
}

function hayNumero(valor: number | null | undefined): valor is number {
  return valor !== null && valor !== undefined && Number.isFinite(Number(valor));
}
