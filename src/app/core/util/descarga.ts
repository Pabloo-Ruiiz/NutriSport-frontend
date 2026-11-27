/**
 * Descarga de archivos que llegan por HttpClient (NutriSport_API.md §7.6): así la petición lleva
 * el token, cosa que un <a href> directo no haría.
 *
 *   const r = await firstValueFrom(http.get(url, { responseType: 'blob', observe: 'response' }));
 *   descargarBlob(r.body!, nombreDeContentDisposition(r.headers.get('Content-Disposition')) ?? 'datos.json');
 */

/**
 * Nombre del archivo de una cabecera Content-Disposition, o null si no viene o no lo trae.
 * Admite `filename*=UTF-8''…` (RFC 5987, tiene prioridad), `filename="…"` y `filename=…`. Quita
 * cualquier ruta ("../x.json" → "x.json").
 */
export function nombreDeContentDisposition(cabecera: string | null | undefined): string | null {
  if (!cabecera) return null;

  const extendido = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(cabecera);
  if (extendido) {
    try {
      const nombre = limpiar(decodeURIComponent(extendido[2].trim().replace(/^"|"$/g, '')));
      if (nombre) return nombre;
    } catch {
      // Codificación no válida: se prueba con filename.
    }
  }

  const simple = /(?:^|;)\s*filename\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^;]+))/i.exec(cabecera);
  if (!simple) return null;
  const valor = simple[1] !== undefined ? simple[1].replace(/\\(.)/g, '$1') : simple[2].trim();
  return limpiar(valor) || null;
}

function limpiar(nombre: string): string {
  return (nombre.split(/[\\/]/).pop() ?? '').trim();
}

/**
 * Descarga un Blob con un enlace <a download> temporal: crea la URL, hace click, quita el enlace y
 * libera la URL.
 */
export function descargarBlob(blob: Blob, nombre: string, documento: Document = document): void {
  const url = URL.createObjectURL(blob);
  const enlace = documento.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.rel = 'noopener';
  enlace.style.display = 'none';
  documento.body.appendChild(enlace);
  try {
    enlace.click();
  } finally {
    enlace.remove();
    // Se libera en la siguiente vuelta: algunos navegadores aún leen la URL justo después del click.
    setTimeout(() => URL.revokeObjectURL(url));
  }
}
