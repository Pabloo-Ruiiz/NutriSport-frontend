import type { RecetaResumenResponse, TipoComida } from '@core/models';
import { ORDEN_TIPOS_COMIDA } from '@core/models/etiquetas';
import type { OrigenFiltroReceta } from '@core/services/recetas.service';

/** Recetas por página del catálogo: múltiplo de 3 y de 4 para llenar las filas de la rejilla. */
export const TAMANO_PAGINA_RECETAS = 12;
/** Longitud máxima de los textos de búsqueda. */
export const MAX_TEXTO_RECETAS = 60;
/** Espera tras la última tecla antes de buscar. */
export const DEBOUNCE_RECETAS_MS = 400;

export const LIMITES_KCAL = { min: 50, max: 5000 } as const;
export const LIMITES_PROTEINA = { min: 0, max: 300 } as const;

export type VistaRecetas = 'explorar' | 'favoritas';

/** Filtros del panel (todo menos el texto, la categoría y la página). */
export interface FiltrosAvanzadosRecetas {
  ingrediente: string | null;
  area: string | null;
  origen: OrigenFiltroReceta;
  franja: TipoComida | null;
  maxKcal: number | null;
  minProteina: number | null;
}

export const FILTROS_AVANZADOS_VACIOS: FiltrosAvanzadosRecetas = {
  ingrediente: null,
  area: null,
  origen: 'todas',
  franja: null,
  maxKcal: null,
  minProteina: null,
};

// ---- Lectura de los query params (cualquier valor no válido se ignora)

export function leerTexto(valor: string | null | undefined): string | null {
  const texto = valor?.trim().slice(0, MAX_TEXTO_RECETAS).trim();
  return texto ? texto : null;
}

export function leerOrigen(valor: string | null | undefined): OrigenFiltroReceta {
  return valor === 'propia' || valor === 'themealdb' ? valor : 'todas';
}

export function leerFranja(valor: string | null | undefined): TipoComida | null {
  return ORDEN_TIPOS_COMIDA.find((t) => t === valor) ?? null;
}

export function leerNumero(
  valor: string | number | null | undefined,
  limites: { min: number; max: number },
): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) && n >= limites.min && n <= limites.max ? n : null;
}

export function leerPagina(valor: string | null | undefined): number {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export function leerVista(valor: string | null | undefined): VistaRecetas {
  return valor === 'favoritas' ? 'favoritas' : 'explorar';
}

/** Cuántos filtros del panel no tienen su valor por defecto (para el botón "Filtros" en móvil). */
export function contarFiltrosActivos(f: FiltrosAvanzadosRecetas): number {
  return (Object.keys(FILTROS_AVANZADOS_VACIOS) as (keyof FiltrosAvanzadosRecetas)[]).filter(
    (clave) => f[clave] !== FILTROS_AVANZADOS_VACIOS[clave],
  ).length;
}

/**
 * Clave estable de una receta en las listas. Las de TheMealDB se identifican por su idMeal, que no
 * cambia al importarlas (entonces reciben id propio); las propias, por su id.
 */
export function claveReceta(r: Pick<RecetaResumenResponse, 'id' | 'origen' | 'referenciaExterna'>): string {
  return r.origen === 'THEMEALDB' && r.referenciaExterna ? `themealdb:${r.referenciaExterna}` : `id:${r.id}`;
}
