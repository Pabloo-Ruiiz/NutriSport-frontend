// Utilidades del catálogo (administración): lectura de los query params de /admin/catalogo/alimentos.
import type { FuenteAlimento, Visibilidad } from '@core/models';
import { ETIQUETAS_FUENTE_ALIMENTO, ETIQUETAS_VISIBILIDAD } from '@core/models/etiquetas';

export const TAMANOS_PAGINA_CATALOGO = [10, 20, 50, 100] as const;
export const TAMANO_CATALOGO_POR_DEFECTO = 20;
/** Columnas por las que se puede ordenar (campos de AlimentoResponse). */
export const CAMPOS_ORDENABLES_CATALOGO = ['nombre', 'marca'] as const;

const FUENTES = Object.keys(ETIQUETAS_FUENTE_ALIMENTO) as FuenteAlimento[];
const VISIBILIDADES = Object.keys(ETIQUETAS_VISIBILIDAD) as Visibilidad[];

export function leerFuente(valor: string | null | undefined): FuenteAlimento | null {
  return FUENTES.includes(valor as FuenteAlimento) ? (valor as FuenteAlimento) : null;
}

export function leerVisibilidad(valor: string | null | undefined): Visibilidad | null {
  return VISIBILIDADES.includes(valor as Visibilidad) ? (valor as Visibilidad) : null;
}

/** "true" / "false" de la URL → boolean; cualquier otra cosa → null (sin filtro). */
export function leerBooleano(valor: string | null | undefined): boolean | null {
  return valor === 'true' ? true : valor === 'false' ? false : null;
}

export function leerPaginaCatalogo(valor: string | null | undefined): number {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export function leerTamanoCatalogo(valor: string | null | undefined): number {
  const n = Number(valor);
  return (TAMANOS_PAGINA_CATALOGO as readonly number[]).includes(n) ? n : TAMANO_CATALOGO_POR_DEFECTO;
}

export function leerOrdenCatalogo(valor: string | null | undefined): string | null {
  const [campo, dir] = (valor ?? '').split(',');
  if (!(CAMPOS_ORDENABLES_CATALOGO as readonly string[]).includes(campo)) return null;
  return `${campo},${dir === 'desc' ? 'desc' : 'asc'}`;
}
