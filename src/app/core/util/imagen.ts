/**
 * Preparación de la foto de un análisis (docs/api/analisis.md §7.1): el backend acepta JPEG o PNG de
 * hasta 10 MB y 40 megapíxeles, así que en el cliente se recodifica siempre a JPEG con el lado mayor
 * ≤ 2048 px. Eso también resuelve HEIC y WebP cuando el navegador sabe decodificarlos.
 */

/** Tamaño máximo del archivo original (10 MB). */
export const TAMANO_MAX_IMAGEN = 10 * 1024 * 1024;

/** Error de la foto en el cliente (no es una imagen, demasiado grande, no se puede procesar). */
export class ErrorImagen extends Error {
  override readonly name = 'ErrorImagen';
}

export interface OpcionesCompresion {
  /** Lado mayor de la imagen resultante, en píxeles. */
  ladoMax?: number;
  /** Calidad JPEG de 0 a 1. */
  calidad?: number;
}

/**
 * Comprueba el archivo antes de procesarlo: tipo image/* y como mucho 10 MB. Devuelve el mensaje de
 * error para el usuario, o null si es válido.
 */
export function validarArchivo(archivo: File): string | null {
  if (!archivo.type.startsWith('image/')) return 'El archivo no es una imagen.';
  if (archivo.size === 0) return 'La imagen está vacía.';
  if (archivo.size > TAMANO_MAX_IMAGEN) return 'La imagen supera los 10 MB.';
  return null;
}

/**
 * Recodifica la foto a JPEG con el lado mayor ≤ `ladoMax` (sin ampliar las pequeñas), respetando la
 * orientación EXIF. El fondo transparente de un PNG queda blanco. Rechaza con un ErrorImagen si el archivo
 * no es válido o el navegador no puede decodificarlo.
 */
export async function comprimirAJpeg(
  archivo: File,
  { ladoMax = 2048, calidad = 0.85 }: OpcionesCompresion = {},
): Promise<Blob> {
  const error = validarArchivo(archivo);
  if (error) throw new ErrorImagen(error);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  } catch {
    throw new ErrorImagen('El archivo no es una imagen.');
  }

  try {
    const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.max(1, Math.round(bitmap.width * escala));
    const alto = Math.max(1, Math.round(bitmap.height * escala));
    return await dibujarJpeg(bitmap, ancho, alto, calidad);
  } finally {
    bitmap.close();
  }
}

async function dibujarJpeg(bitmap: ImageBitmap, ancho: number, alto: number, calidad: number): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(ancho, alto);
    pintar(canvas.getContext('2d'), bitmap, ancho, alto);
    return canvas.convertToBlob({ type: 'image/jpeg', quality: calidad });
  }
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  pintar(canvas.getContext('2d'), bitmap, ancho, alto);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ErrorImagen('No se ha podido procesar la imagen.'))),
      'image/jpeg',
      calidad,
    ),
  );
}

function pintar(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null,
  bitmap: ImageBitmap,
  ancho: number,
  alto: number,
): void {
  if (!ctx) throw new ErrorImagen('No se ha podido procesar la imagen.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
}
