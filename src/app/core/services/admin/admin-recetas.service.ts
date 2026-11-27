import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import type {
  MapeoIngredienteResponse,
  Pagina,
  PublicarRecetaRequest,
  RecetaAdminRequest,
  RecetaResponse,
} from '../../models';

/** Tamaño de página máximo que admite GET /admin/mapeos-ingredientes. */
export const MAX_TAMANO_PAGINA_MAPEOS = 100;

export interface FiltroMapeos {
  /** false = la cola de pendientes; true = revisados; null/undefined = todos. */
  revisado?: boolean | null;
  /** Página desde 0. */
  page: number;
  /** Como mucho 100. */
  size: number;
}

/**
 * Recetas públicas y emparejamientos de ingredientes desde la administración (docs/api/admin.md §6).
 * Solo rol ADMIN; cada acción queda auditada en el backend.
 *
 * No hay listado de administración de recetas: se buscan con RecetasService.buscar. Las recetas
 * se crean sin publicar; la publicación (y las raciones reales y franjas) va aparte, con PATCH.
 */
@Injectable({ providedIn: 'root' })
export class AdminRecetasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin`;

  // ---- Recetas

  /** POST /admin/recetas (201): receta propia pública, sin publicar y con sus nutrientes calculados. */
  crear(req: RecetaAdminRequest): Observable<RecetaResponse> {
    return this.http.post<RecetaResponse>(`${this.url}/recetas`, req);
  }

  /** PUT /admin/recetas/{id}: sustituye datos e ingredientes. 404 si no es propia pública. */
  editar(id: string, req: RecetaAdminRequest): Observable<RecetaResponse> {
    return this.http.put<RecetaResponse>(this.rutaReceta(id), req);
  }

  /** DELETE /admin/recetas/{id} (204). 409 RECETA_PLANIFICADA si está en algún menú. */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(this.rutaReceta(id));
  }

  /**
   * PATCH /admin/recetas/{id}/publicacion: publicada, raciones reales y franjas. Los campos
   * ausentes no cambian. Vale para recetas propias y de TheMealDB.
   */
  publicacion(id: string, req: PublicarRecetaRequest): Observable<RecetaResponse> {
    return this.http.patch<RecetaResponse>(`${this.rutaReceta(id)}/publicacion`, req);
  }

  // ---- Emparejamientos de ingredientes

  /** GET /admin/mapeos-ingredientes: con revisado=false, la cola de pendientes. Por nombre. */
  mapeos(filtro: FiltroMapeos): Observable<Pagina<MapeoIngredienteResponse>> {
    const page = Math.max(0, Math.floor(filtro.page) || 0);
    const size = Math.min(MAX_TAMANO_PAGINA_MAPEOS, Math.max(1, Math.floor(filtro.size) || 20));
    let params = new HttpParams().set('page', page).set('size', size);
    if (typeof filtro.revisado === 'boolean') params = params.set('revisado', filtro.revisado);
    return this.http.get<Pagina<MapeoIngredienteResponse>>(`${this.url}/mapeos-ingredientes`, { params });
  }

  /**
   * PUT /admin/mapeos-ingredientes/{id}: fija el alimento equivalente (null = sin equivalente). Queda
   * MANUAL y revisado; la respuesta dice cuántas recetas se han recalculado.
   */
  emparejar(id: string, alimentoId: string | null): Observable<MapeoIngredienteResponse> {
    return this.http.put<MapeoIngredienteResponse>(
      `${this.url}/mapeos-ingredientes/${encodeURIComponent(id)}`,
      alimentoId ? { alimentoId } : {},
    );
  }

  private rutaReceta(id: string): string {
    return `${this.url}/recetas/${encodeURIComponent(id)}`;
  }
}
