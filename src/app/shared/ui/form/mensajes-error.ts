import { ValidationErrors } from '@angular/forms';

import { formatearNumero } from '@shared/pipes/formato';

type Detalle = Record<string, number>;

/**
 * Mensajes en castellano de los validadores (DESIGN.md §11: frases cortas, de tú, que explican
 * qué hacer). Cada función recibe el valor que Angular guarda en `errors[clave]`.
 */
const MENSAJES: Record<string, (detalle: unknown) => string> = {
  required: () => 'Este campo es obligatorio.',
  requiredTrue: () => 'Debes marcar esta casilla para continuar.',
  email: () => 'Escribe un correo electrónico válido, p. ej. nombre@correo.com.',
  minlength: (e) => `Escribe al menos ${(e as Detalle)['requiredLength']} caracteres.`,
  maxlength: (e) => `Escribe como máximo ${(e as Detalle)['requiredLength']} caracteres.`,
  min: (e) => `El valor mínimo es ${limite((e as Detalle)['min'])}.`,
  max: (e) => `El valor máximo es ${limite((e as Detalle)['max'])}.`,
  pattern: () => 'El formato no es válido.',
  // Validadores propios (core/util/validadores.ts).
  contrasenaSegura: (e) => MENSAJES_CONTRASENA[(e as { motivo?: string })?.motivo ?? ''] ?? MENSAJE_GENERICO,
  coincideCon: () => 'Las contraseñas no coinciden.',
  noSoloEspacios: () => 'Escribe algo más que espacios.',
  fechaNoValida: () => 'Escribe una fecha válida.',
  edadMinima: (e) => `Debes tener al menos ${(e as Detalle)['minima']} años.`,
  // Texto que devuelve el backend (p. ej. "Ya existe una cuenta con este correo").
  servidor: (texto) => textoServidor(texto),
};

/** Motivos de contrasenaSegura() (PASSWORD_MIN y PASSWORD_MAX de core/util/validadores.ts). */
const MENSAJES_CONTRASENA: Record<string, string> = {
  corta: 'La contraseña debe tener al menos 10 caracteres.',
  larga: 'La contraseña puede tener como máximo 72 caracteres.',
  sinLetra: 'La contraseña debe incluir al menos una letra.',
  sinNumero: 'La contraseña debe incluir al menos un número.',
};

/** "2.450", "0,5": con los decimales que tenga el límite (máximo 2). */
function limite(valor: number): string {
  const decimales = Number.isInteger(valor) ? 0 : Math.min(2, String(valor).split('.')[1]?.length ?? 0);
  return formatearNumero(valor, decimales);
}

const MENSAJE_GENERICO = 'El valor no es válido.';

function textoServidor(texto: unknown): string {
  if (typeof texto === 'string' && texto.trim()) return texto;
  if (Array.isArray(texto)) return texto.filter((t) => typeof t === 'string').join(' ') || MENSAJE_GENERICO;
  return MENSAJE_GENERICO;
}

/** Mensaje de un error concreto. Claves desconocidas → mensaje genérico. */
export function mensajeError(clave: string, detalle: unknown): string {
  return MENSAJES[clave]?.(detalle) ?? MENSAJE_GENERICO;
}

/**
 * Mensaje del primer error del control, o null si no hay errores. El orden es el de los
 * validadores, salvo 'servidor', que tiene prioridad: es lo último que ha pasado.
 */
export function primerMensajeError(errores: ValidationErrors | null | undefined): string | null {
  if (!errores) return null;
  const claves = Object.keys(errores);
  if (claves.length === 0) return null;
  const clave = 'servidor' in errores ? 'servidor' : claves[0];
  return mensajeError(clave, errores[clave]);
}
