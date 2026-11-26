import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import { environment } from '@env/environment';
import type { AlimentoResumenResponse, Pagina } from '../models';

/** Caracteres mínimos para buscar: con menos no se llama al backend. */
export const MIN_CARACTERES_BUSQUEDA = 2;
/** Tamaño de página máximo que admite GET /alimentos. */
export const MAX_TAMANO_PAGINA = 50;

export interface OpcionesBusqueda {
  /** Id de la categoría. */
  categoria?: string | null;
  /** Página desde 0. */
  page?: number;
  /** Tamaño de página (por defecto 20, como mucho 50). */
  size?: number;
}

/**
 * Catálogo de alimentos (NutriSport_API.md §6 Catálogo): públicos y privados propios. Por ahora
 * solo la búsqueda; el resto (detalle, recientes, frecuentes, alimentos propios) llega en el paso 14.
 */
@Injectable({ providedIn: 'root' })
export class AlimentosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/alimentos`;

  /**
   * GET /alimentos?q=…: tolera tildes, mayúsculas y errores de escritura; los más parecidos van
   * primero. Con menos de 2 caracteres (sin contar espacios) no llama y devuelve una página vacía.
   */
  buscar(q: string, opciones: OpcionesBusqueda = {}): Observable<Pagina<AlimentoResumenResponse>> {
    const texto = q.trim();
    const page = Math.max(0, Math.floor(opciones.page ?? 0));
    const size = Math.min(MAX_TAMANO_PAGINA, Math.max(1, Math.floor(opciones.size ?? 20)));

    if (texto.length < MIN_CARACTERES_BUSQUEDA) {
      return of({ content: [], page, size, totalElements: 0, totalPages: 0 });
    }

    let params = new HttpParams().set('q', texto).set('page', page).set('size', size);
    if (opciones.categoria) params = params.set('categoria', opciones.categoria);
    return this.http.get<Pagina<AlimentoResumenResponse>>(this.url, { params });
  }
}
