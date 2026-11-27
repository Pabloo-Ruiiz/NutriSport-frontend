import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, switchMap, throwError } from 'rxjs';

import { environment } from '@env/environment';
import type {
  BusquedaRecetasResponse,
  CategoriaResponse,
  NutricionRecetaResponse,
  RecetaResponse,
  RecetaResumenResponse,
  TipoComida,
} from '../models';

export type OrigenFiltroReceta = 'todas' | 'propia' | 'themealdb';

/** Filtros de GET /recetas (NutriSport_API.md §6 · Recetas). */
export interface FiltrosRecetas {
  q?: string | null;
  ingrediente?: string | null;
  /** UUID obtenido de GET /recetas/categorias, no el nombre visible de la categoría. */
  categoria?: string | null;
  area?: string | null;
  /** 'todas' es el valor por defecto: no se envía. */
  origen?: OrigenFiltroReceta | null;
  franja?: TipoComida | null;
  maxKcal?: number | null;
  minProteina?: number | null;
  page: number;
  size: number;
}

/**
 * Catálogo de recetas propias y de TheMealDB (Ampliación A2–A3, NutriSport_API.md §6 y §7.4).
 *
 * - `buscar` devuelve el catálogo paginado y, solo en la primera página, las recetas de TheMealDB
 *   aún no importadas (`id = null`). Si TheMealDB no responde, `themealdbDisponible = false`
 *   (§3.2): no es un error, la pantalla muestra solo el catálogo con un aviso.
 * - `abrir` resuelve el id propio de cualquier resumen: si no lo tiene, importa la receta de
 *   TheMealDB con su `referenciaExterna`; después se usa siempre `/recetas/{id}`.
 */
@Injectable({ providedIn: 'root' })
export class RecetasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/recetas`;

  private categorias$?: Observable<CategoriaResponse[]>;

  /** Busca recetas. Solo envía los filtros con valor (y nunca origen = 'todas'). */
  buscar(filtros: FiltrosRecetas): Observable<BusquedaRecetasResponse> {
    const { page, size } = filtros;
    if (!Number.isInteger(page) || page < 0)
      return throwError(() => new RangeError('La página debe ser un entero mayor o igual que 0.'));
    if (!Number.isInteger(size) || size < 1)
      return throwError(() => new RangeError('El tamaño de página debe ser un entero mayor que 0.'));

    let params = new HttpParams();
    for (const clave of ['q', 'ingrediente', 'categoria', 'area', 'franja'] as const) {
      const valor = filtros[clave]?.trim();
      if (valor) params = params.set(clave, valor);
    }
    if (filtros.origen && filtros.origen !== 'todas') params = params.set('origen', filtros.origen);
    for (const clave of ['maxKcal', 'minProteina'] as const) {
      const valor = filtros[clave];
      if (typeof valor === 'number' && Number.isFinite(valor)) params = params.set(clave, valor);
    }
    params = params.set('page', page).set('size', size);

    return this.http.get<BusquedaRecetasResponse>(this.url, { params });
  }

  /**
   * Categorías de receta en castellano, en su orden. Cambian muy poco: se cachean mientras dure la
   * aplicación; si la petición falla, no se guarda el error.
   */
  categorias(): Observable<CategoriaResponse[]> {
    this.categorias$ ??= this.http.get<CategoriaResponse[]>(`${this.url}/categorias`).pipe(
      catchError((error: unknown) => {
        this.categorias$ = undefined;
        return throwError(() => error);
      }),
      shareReplay(1),
    );
    return this.categorias$;
  }

  /** Detalle con las cantidades para las raciones pedidas (por defecto, las de la receta). */
  detalle(id: string, raciones?: number): Observable<RecetaResponse> {
    return this.http.get<RecetaResponse>(this.ruta(id), { params: this.paramsRaciones(raciones) });
  }

  /** Desglose del cálculo nutricional por ingrediente. */
  nutricion(id: string, raciones?: number): Observable<NutricionRecetaResponse> {
    return this.http.get<NutricionRecetaResponse>(`${this.ruta(id)}/nutricion`, {
      params: this.paramsRaciones(raciones),
    });
  }

  /** Hasta 6 recetas de la misma categoría o con el mismo primer ingrediente. */
  relacionadas(id: string): Observable<RecetaResumenResponse[]> {
    return this.http.get<RecetaResumenResponse[]>(`${this.ruta(id)}/relacionadas`);
  }

  /** Mis favoritas, las marcadas más recientemente primero. */
  favoritas(): Observable<RecetaResumenResponse[]> {
    return this.http.get<RecetaResumenResponse[]>(`${this.url}/favoritas`);
  }

  /** Idempotente: si ya era favorita, no cambia nada. */
  marcarFavorita(id: string): Observable<void> {
    return this.http.put<void>(`${this.ruta(id)}/favorita`, null);
  }

  /** Idempotente: si no era favorita, no cambia nada. */
  quitarFavorita(id: string): Observable<void> {
    return this.http.delete<void>(`${this.ruta(id)}/favorita`);
  }

  /**
   * Detalle de una receta de TheMealDB: la importa la primera vez (en inglés, 4 raciones supuestas)
   * y devuelve su detalle con el id propio.
   */
  importarTheMealDb(idMeal: string): Observable<RecetaResponse> {
    return this.http.get<RecetaResponse>(`${this.url}/externas/themealdb/${encodeURIComponent(idMeal)}`);
  }

  /**
   * Marca o quita una favorita a partir de un resumen: si aún no está importada, la importa antes.
   * Devuelve el id propio de la receta.
   */
  cambiarFavorita(
    resumen: Pick<RecetaResumenResponse, 'id' | 'referenciaExterna'>,
    favorita: boolean,
  ): Observable<string> {
    return this.abrir(resumen).pipe(
      switchMap((id) => (favorita ? this.marcarFavorita(id) : this.quitarFavorita(id)).pipe(map(() => id))),
    );
  }

  /** Id propio de la receta; si aún no está importada, la importa con su referenciaExterna. */
  abrir(resumen: Pick<RecetaResumenResponse, 'id' | 'referenciaExterna'>): Observable<string> {
    if (resumen.id) return of(resumen.id);
    if (resumen.referenciaExterna) return this.importarTheMealDb(resumen.referenciaExterna).pipe(map((r) => r.id));
    return throwError(() => new Error('La receta no tiene id ni referencia externa.'));
  }

  private ruta(id: string): string {
    return `${this.url}/${encodeURIComponent(id)}`;
  }

  private paramsRaciones(raciones?: number): HttpParams {
    let params = new HttpParams();
    if (raciones !== undefined && Number.isInteger(raciones) && raciones > 0) params = params.set('raciones', raciones);
    return params;
  }
}
