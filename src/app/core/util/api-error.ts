import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import type { ErrorCampo, ProblemDetail } from '../models/comun';

/**
 * Códigos de error del backend (NutriSport_API.md §3.1) más SIN_CONEXION, que crea el cliente
 * cuando no hay respuesta (status 0). Se admite cualquier otro texto por si el backend añade
 * códigos nuevos.
 */
export type CodigoError =
  | 'VALIDACION'
  | 'TOKEN_NO_VALIDO'
  | 'NO_AUTENTICADO'
  | 'SIN_PERMISO'
  | 'EMAIL_NO_VERIFICADO'
  | 'CONSENTIMIENTO_REVOCADO'
  | 'NO_ENCONTRADO'
  | 'CONFLICTO'
  | 'EMAIL_EN_USO'
  | 'CODIGO_BARRAS_EN_USO'
  | 'COMIDA_CONSUMIDA'
  | 'SUGERENCIA_APLICADA'
  | 'SUGERENCIA_OBSOLETA'
  | 'RECETA_PLANIFICADA'
  | 'ANALISIS_NO_CONFIRMABLE'
  | 'ANALISIS_NO_DESCARTABLE'
  | 'ARCHIVO_DEMASIADO_GRANDE'
  | 'ARCHIVO_NO_VALIDO'
  | 'PERFIL_REQUERIDO'
  | 'NUTRICION_INCOMPLETA'
  | 'RECETA_NO_PUBLICADA'
  | 'RECETA_INCOMPATIBLE'
  | 'SIN_RECETAS_COMPATIBLES'
  | 'SUGERENCIA_NO_VALIDA'
  | 'REGLA_NEGOCIO'
  | 'LIMITE_EXCEDIDO'
  | 'SERVICIO_NO_DISPONIBLE'
  | 'PROVEEDOR_NO_DISPONIBLE'
  | 'ERROR_INTERNO'
  | 'SIN_CONEXION'
  // (string & {}) admite cualquier texto sin perder el autocompletado de los literales.
  | (string & {});

export const DETALLE_SIN_CONEXION = 'No hay conexión con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
export const DETALLE_ERROR_INTERNO = 'Ha ocurrido un error inesperado. Inténtalo de nuevo dentro de un momento.';

export interface ApiErrorInit {
  status: number;
  codigo: CodigoError;
  titulo: string;
  detalle: string;
  errores?: ErrorCampo[];
  retryAfterSegundos?: number | null;
  url?: string | null;
  cause?: unknown;
}

/**
 * Error de la API ya normalizado (NutriSport_API.md §3). Lo crea aApiError() a partir de un
 * HttpErrorResponse; las pantallas solo trabajan con esta clase.
 *
 *   catch (e) {
 *     const error = aApiError(e);
 *     if (error.esCodigo('VALIDACION') && aplicarErroresServidor(this.form, error)) return;
 *     if (error.esCodigo('LIMITE_EXCEDIDO')) this.aviso.set(error.mensajeEspera());
 *     else this.aviso.set(error.detalle);
 *   }
 */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  /** Estado HTTP (0 sin conexión). */
  readonly status: number;
  readonly codigo: CodigoError;
  /** Título corto del backend ("Datos no válidos"). Para el usuario se muestra `detalle`. */
  readonly titulo: string;
  /** Mensaje para el usuario (`detail` de Problem Details). */
  readonly detalle: string;
  /** Errores de campo (`errors`); vacío si el error no es de un campo. */
  readonly errores: readonly ErrorCampo[];
  /** Segundos de espera de la cabecera Retry-After (429 y 503), o null. */
  readonly retryAfterSegundos: number | null;
  /** URL de la petición que falló. */
  readonly url: string | null;

  constructor(init: ApiErrorInit) {
    super(init.detalle, init.cause === undefined ? undefined : { cause: init.cause });
    this.status = init.status;
    this.codigo = init.codigo;
    this.titulo = init.titulo;
    this.detalle = init.detalle;
    this.errores = init.errores ?? [];
    this.retryAfterSegundos = init.retryAfterSegundos ?? null;
    this.url = init.url ?? null;
  }

  /** true si el código es alguno de los indicados. */
  esCodigo(...codigos: CodigoError[]): boolean {
    return codigos.includes(this.codigo);
  }

  /** Errores de un campo concreto ("password", "alimentos[0].cantidad"). */
  erroresDe(campo: string): ErrorCampo[] {
    return this.errores.filter((error) => error.campo === campo);
  }

  /**
   * Texto de espera a partir de Retry-After (§2.3): "Inténtalo de nuevo en 12 minutos".
   * Redondea hacia arriba para no invitar a reintentar antes de tiempo.
   */
  mensajeEspera(): string {
    return textoEspera(this.retryAfterSegundos);
  }
}

/** "Inténtalo de nuevo en 12 minutos." a partir de unos segundos de espera (o null si no se sabe). */
export function textoEspera(segundos: number | null): string {
  if (segundos === null) return 'Inténtalo de nuevo más tarde.';
  if (segundos <= 0) return 'Ya puedes intentarlo de nuevo.';
  return `Inténtalo de nuevo en ${duracion(segundos)}.`;
}

/** "45 segundos", "1 minuto", "12 minutos", "1 hora", "2 horas y 5 minutos". */
function duracion(segundos: number): string {
  if (segundos < 60) return plural(Math.ceil(segundos), 'segundo', 'segundos');
  const minutos = Math.ceil(segundos / 60);
  if (minutos < 60) return plural(minutos, 'minuto', 'minutos');
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  const textoHoras = plural(horas, 'hora', 'horas');
  return resto ? `${textoHoras} y ${plural(resto, 'minuto', 'minutos')}` : textoHoras;
}

function plural(n: number, singular: string, varios: string): string {
  return `${n} ${n === 1 ? singular : varios}`;
}

/**
 * Estado HTTP de un error, venga como HttpErrorResponse (sin pasar por errorInterceptor) o como
 * ApiError (después). null si no es un error HTTP.
 */
export function estadoHttp(e: unknown): number | null {
  if (e instanceof ApiError || e instanceof HttpErrorResponse) return e.status;
  return null;
}

/**
 * Convierte cualquier error en ApiError:
 * - HttpErrorResponse con cuerpo Problem Details (tiene `codigo`) → sus campos.
 * - status 0 (sin conexión, CORS, servidor caído) → SIN_CONEXION.
 * - Cualquier otro (502 del proxy con HTML, error de JavaScript…) → ERROR_INTERNO con un texto
 *   genérico; el original queda en `cause`.
 * En todos los casos con respuesta HTTP se lee Retry-After.
 */
export function aApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;

  if (e instanceof HttpErrorResponse) {
    const url = e.url ?? null;
    const retryAfterSegundos = leerRetryAfter(e.headers);

    if (e.status === 0) {
      return new ApiError({
        status: 0,
        codigo: 'SIN_CONEXION',
        titulo: 'Sin conexión',
        detalle: DETALLE_SIN_CONEXION,
        url,
        cause: e,
      });
    }

    const problema = leerProblema(e.error);
    if (problema) {
      return new ApiError({
        status: typeof problema.status === 'number' ? problema.status : e.status,
        codigo: problema.codigo,
        titulo: textoO(problema.title, e.statusText || 'Error'),
        detalle: textoO(problema.detail, DETALLE_ERROR_INTERNO),
        errores: Array.isArray(problema.errors) ? problema.errors.filter(esErrorCampo) : [],
        retryAfterSegundos,
        url: url ?? problema.instance ?? null,
        cause: e,
      });
    }

    return new ApiError({
      status: e.status,
      codigo: 'ERROR_INTERNO',
      titulo: 'Error inesperado',
      detalle: DETALLE_ERROR_INTERNO,
      retryAfterSegundos,
      url,
      cause: e,
    });
  }

  return new ApiError({
    status: 0,
    codigo: 'ERROR_INTERNO',
    titulo: 'Error inesperado',
    detalle: DETALLE_ERROR_INTERNO,
    cause: e,
  });
}

/**
 * Cuerpo Problem Details si lo es (tiene `codigo`). Acepta el objeto ya parseado o el texto JSON
 * (peticiones con responseType 'text').
 */
function leerProblema(cuerpo: unknown): (Partial<ProblemDetail> & { codigo: string }) | null {
  let valor = cuerpo;
  if (typeof valor === 'string') {
    try {
      valor = JSON.parse(valor);
    } catch {
      return null;
    }
  }
  if (valor && typeof valor === 'object' && typeof (valor as ProblemDetail).codigo === 'string') {
    return valor as Partial<ProblemDetail> & { codigo: string };
  }
  return null;
}

/** Retry-After en segundos: admite un número ("720") o una fecha HTTP. null si no viene o no es válida. */
export function leerRetryAfter(cabeceras: HttpHeaders | null | undefined, ahora = Date.now()): number | null {
  const valor = cabeceras?.get('Retry-After')?.trim();
  if (!valor) return null;
  if (/^\d+$/.test(valor)) return Number(valor);
  const fecha = Date.parse(valor);
  return Number.isNaN(fecha) ? null : Math.max(0, Math.ceil((fecha - ahora) / 1000));
}

function esErrorCampo(valor: unknown): valor is ErrorCampo {
  return (
    !!valor && typeof (valor as ErrorCampo).campo === 'string' && typeof (valor as ErrorCampo).mensaje === 'string'
  );
}

function textoO(valor: unknown, alternativa: string): string {
  return typeof valor === 'string' && valor.trim() ? valor : alternativa;
}
