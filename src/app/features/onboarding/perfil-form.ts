import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import type {
  NivelActividad,
  ObjetivoDeportivo,
  PerfilRequest,
  PreferenciaDto,
  Sexo,
  TipoPreferencia,
} from '@core/models';
import type { ApiError } from '@core/util/api-error';
import { rutaDeCampo } from '@core/util/formularios';
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

/** Formulario vacío del perfil (comidasPorDia empieza en 4). */
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
      tiempoMaxCocinaMin: numero([Validators.min(0), Validators.max(600)]),
    }),
  });

  // La fecha de competición depende del objetivo: se revalida cuando cambia. Ambos controles viven
  // lo mismo que el formulario, así que la suscripción no necesita cancelarse.
  const { objetivo, fechaCompeticion } = form.controls.objetivo.controls;
  objetivo.valueChanges.subscribe(() => fechaCompeticion.updateValueAndValidity());

  return form;
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
  };
  if (hayNumero(sobreTi.porcentajeGrasa)) peticion.porcentajeGrasa = Number(sobreTi.porcentajeGrasa);
  if (objetivo.objetivo === 'COMPETICION' && objetivo.fechaCompeticion) {
    peticion.fechaCompeticion = objetivo.fechaCompeticion;
  }
  if (hayNumero(alimentacion.tiempoMaxCocinaMin)) peticion.tiempoMaxCocinaMin = Number(alimentacion.tiempoMaxCocinaMin);
  return peticion;
}

/** Campo que exige cada tipo de preferencia (PUT /perfil/preferencias). */
const CAMPOS_POR_TIPO: Record<TipoPreferencia, readonly (keyof PreferenciaDto)[]> = {
  ALERGIA: ['alergeno'],
  INTOLERANCIA: ['intolerancia'],
  DIETA: ['dieta'],
  RECHAZO: ['alimentoId', 'categoriaId'],
  FAVORITO: ['alimentoId', 'categoriaId'],
};

/**
 * Lista exacta para PUT /perfil/preferencias: cada preferencia con tipo, severidad y solo el campo
 * que exige su tipo (alergeno, intolerancia, dieta, o alimentoId/categoriaId). Las que no traen
 * ese campo se descartan y las repetidas se envían una vez.
 */
export function aPreferencias(valor: ValorFormularioPerfil): PreferenciaDto[] {
  const vistas = new Set<string>();
  const resultado: PreferenciaDto[] = [];
  for (const p of valor.alimentacion.preferencias) {
    const dto: PreferenciaDto = { tipo: p.tipo, severidad: p.severidad };
    let completo = false;
    for (const campo of CAMPOS_POR_TIPO[p.tipo] ?? []) {
      const dato = p[campo];
      if (dato) {
        Object.assign(dto, { [campo]: dato });
        completo = true;
        break; // RECHAZO y FAVORITO: alimentoId o categoriaId, no los dos.
      }
    }
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
