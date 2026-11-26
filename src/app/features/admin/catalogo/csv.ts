// Lectura mínima de un CSV para PREVISUALIZARLO en la importación (docs/api/admin.md §7.7).
// No valida nada: el que valida (cabecera, columnas, valores) es el servidor.

import { MAX_BYTES_IMPORTACION } from '@core/services/admin/admin-catalogo.service';

/** Bytes que se leen para la vista previa: de sobra para la cabecera y 5 filas. */
export const BYTES_VISTA_PREVIA = 64 * 1024;

export interface VistaPreviaCsv {
  cabecera: string[];
  /** Las primeras filas de datos (sin la cabecera). */
  filas: string[][];
  separador: ',' | ';' | '\t';
}

/** Mensaje si el fichero no se puede importar, o null si se puede enviar. */
export function validarCsv(archivo: File): string | null {
  const esCsv = /\.csv$/i.test(archivo.name) || archivo.type === 'text/csv';
  if (!esCsv) return 'El fichero debe ser un CSV (.csv).';
  if (archivo.size === 0) return 'El fichero está vacío.';
  if (archivo.size > MAX_BYTES_IMPORTACION) return 'El fichero pesa más de 10 MB.';
  return null;
}

/** Lee el principio del fichero como texto UTF-8 con FileReader. */
export function leerInicio(archivo: File, bytes = BYTES_VISTA_PREVIA): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result ?? ''));
    lector.onerror = () => rechazar(lector.error ?? new Error('No se ha podido leer el fichero'));
    lector.readAsText(archivo.slice(0, bytes), 'utf-8');
  });
}

/**
 * Cabecera y primeras `numFilas` filas. Detecta el separador (; , o tabulador) por la cabecera y
 * respeta los campos entre comillas ("Pan, integral"; "" es una comilla). La última línea se
 * descarta si el texto venía cortado y no es la única.
 */
export function previsualizarCsv(texto: string, numFilas = 5, cortado = false): VistaPreviaCsv {
  const limpio = texto.replace(/^﻿/, '');
  const primeraLinea = limpio.split(/\r?\n/, 1)[0] ?? '';
  const separador = detectarSeparador(primeraLinea);
  const lineas = partirLineas(limpio, separador).filter((campos) => campos.some((c) => c.trim() !== ''));
  if (cortado && lineas.length > 1) lineas.pop();
  const [cabecera = [], ...datos] = lineas;
  return { cabecera, filas: datos.slice(0, numFilas), separador };
}

function detectarSeparador(linea: string): VistaPreviaCsv['separador'] {
  const cuenta = (c: string) => linea.split(c).length - 1;
  const candidatos: VistaPreviaCsv['separador'][] = [';', ',', '\t'];
  return candidatos.reduce((mejor, c) => (cuenta(c) > cuenta(mejor) ? c : mejor), ';');
}

/** Parte el texto en filas y campos (comillas dobles incluidas, con saltos de línea dentro). */
function partirLineas(texto: string, separador: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') entreComillas = false;
      else campo += c;
    } else if (c === '"' && campo === '') entreComillas = true;
    else if (c === separador) {
      fila.push(campo.trim());
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo.trim());
      filas.push(fila);
      fila = [];
      campo = '';
    } else campo += c;
  }
  if (campo !== '' || fila.length) {
    fila.push(campo.trim());
    filas.push(fila);
  }
  return filas;
}
