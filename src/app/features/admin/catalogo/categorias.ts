// Árbol de categorías (administración del catálogo).
import type { CategoriaResponse, TipoCategoria } from '@core/models';

export interface NodoCategoria {
  categoria: CategoriaResponse;
  hijos: NodoCategoria[];
  nivel: number;
}

export const TIPOS_CATEGORIA: readonly TipoCategoria[] = ['ALIMENTO', 'RECETA'];

export function leerTipoCategoria(valor: string | null | undefined): TipoCategoria {
  return valor === 'RECETA' ? 'RECETA' : 'ALIMENTO';
}

const ordenar = (lista: CategoriaResponse[]) =>
  [...lista].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));

/**
 * Árbol por `padreId`, cada nivel por `orden` y nombre. Las que apuntan a un padre que no está en
 * la lista van como raíces; los ciclos en los datos se cortan.
 */
export function arbolCategorias(categorias: readonly CategoriaResponse[]): NodoCategoria[] {
  const ids = new Set(categorias.map((c) => c.id));
  const hijas = new Map<string | null, CategoriaResponse[]>();
  for (const c of categorias) {
    const padre = c.padreId && ids.has(c.padreId) && c.padreId !== c.id ? c.padreId : null;
    hijas.set(padre, [...(hijas.get(padre) ?? []), c]);
  }
  const construir = (padre: string | null, nivel: number, vistos: ReadonlySet<string>): NodoCategoria[] =>
    ordenar(hijas.get(padre) ?? [])
      .filter((c) => !vistos.has(c.id))
      .map((categoria) => ({
        categoria,
        nivel,
        hijos: construir(categoria.id, nivel + 1, new Set([...vistos, categoria.id])),
      }));
  return construir(null, 0, new Set());
}

/** Ids de la categoría y de todas sus descendientes (no pueden ser su padre). */
export function conDescendientes(categorias: readonly CategoriaResponse[], id: string): Set<string> {
  const resultado = new Set([id]);
  let anadidas = true;
  while (anadidas) {
    anadidas = false;
    for (const c of categorias) {
      if (c.padreId && resultado.has(c.padreId) && !resultado.has(c.id)) {
        resultado.add(c.id);
        anadidas = true;
      }
    }
  }
  return resultado;
}
