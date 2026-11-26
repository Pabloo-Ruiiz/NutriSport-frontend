import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';

import { environment } from '@env/environment';
import type { CategoriaResponse, TipoCategoria } from '../models';

/**
 * Categorías de alimentos o de recetas (GET /categorias?tipo=…) en su orden de presentación, con
 * su categoría padre. Cambian muy poco (solo las edita la administración): se cachean por tipo
 * mientras dure la aplicación. Si la petición falla, no se guarda el error.
 */
@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/categorias`;

  private readonly cache = new Map<TipoCategoria, Observable<CategoriaResponse[]>>();

  listar(tipo: TipoCategoria): Observable<CategoriaResponse[]> {
    let categorias$ = this.cache.get(tipo);
    if (!categorias$) {
      categorias$ = this.http.get<CategoriaResponse[]>(this.url, { params: new HttpParams().set('tipo', tipo) }).pipe(
        catchError((error: unknown) => {
          this.cache.delete(tipo);
          return throwError(() => error);
        }),
        shareReplay(1),
      );
      this.cache.set(tipo, categorias$);
    }
    return categorias$;
  }

  /**
   * Olvida la caché (de un tipo o de todos). Para la administración del catálogo (paso 22), tras
   * crear, editar o borrar una categoría.
   */
  invalidar(tipo?: TipoCategoria): void {
    if (tipo) this.cache.delete(tipo);
    else this.cache.clear();
  }
}
