import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import type { ActualizarUsuarioAdminRequest, EstadoUsuario, Pagina, UsuarioAdminResponse } from '../../models';

/** Tamaño de página máximo que admite GET /admin/usuarios. */
export const MAX_TAMANO_PAGINA_USUARIOS = 100;

export interface FiltroUsuariosAdmin {
  /** Texto libre (nombre o email). Vacío = sin filtro. */
  q?: string | null;
  estado?: EstadoUsuario | null;
  /** Página desde 0. */
  page: number;
  /** Tamaño de página (como mucho 100). */
  size: number;
  /** "campo,asc|desc" (uno o varios). Sin él, los más recientes primero. */
  sort?: string | readonly string[] | null;
}

/**
 * Usuarios desde el panel de administración (docs/api/admin.md §6 Admin): búsqueda, datos de
 * cuenta y bloqueo / cambio de roles. Solo rol ADMIN; nunca da acceso a datos de salud.
 */
@Injectable({ providedIn: 'root' })
export class AdminUsuariosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin/usuarios`;

  /** GET /admin/usuarios: filtros opcionales y combinables; los más recientes primero por defecto. */
  buscar(filtro: FiltroUsuariosAdmin): Observable<Pagina<UsuarioAdminResponse>> {
    const page = Math.max(0, Math.floor(filtro.page) || 0);
    const size = Math.min(MAX_TAMANO_PAGINA_USUARIOS, Math.max(1, Math.floor(filtro.size) || 20));

    let params = new HttpParams().set('page', page).set('size', size);
    const q = filtro.q?.trim();
    if (q) params = params.set('q', q);
    if (filtro.estado) params = params.set('estado', filtro.estado);
    const sort = typeof filtro.sort === 'string' ? [filtro.sort] : (filtro.sort ?? []);
    for (const orden of sort) if (orden) params = params.append('sort', orden);

    return this.http.get<Pagina<UsuarioAdminResponse>>(this.url, { params });
  }

  /** GET /admin/usuarios/{id}: nombre, email, roles, estado, verificación, último acceso y alta. 404 si no existe. */
  detalle(id: string): Observable<UsuarioAdminResponse> {
    return this.http.get<UsuarioAdminResponse>(`${this.url}/${encodeURIComponent(id)}`);
  }

  /**
   * PATCH /admin/usuarios/{id}: los campos ausentes no cambian. El estado solo puede ser ACTIVO o
   * BLOQUEADO (bloquear cierra todas sus sesiones). 422 si la cuenta está eliminada o si un
   * administrador intenta bloquearse o quitarse el rol ADMIN.
   */
  actualizar(id: string, req: ActualizarUsuarioAdminRequest): Observable<UsuarioAdminResponse> {
    const cuerpo: ActualizarUsuarioAdminRequest = {};
    if (req.estado) cuerpo.estado = req.estado;
    if (req.roles?.length) cuerpo.roles = [...new Set(req.roles)];
    return this.http.patch<UsuarioAdminResponse>(`${this.url}/${encodeURIComponent(id)}`, cuerpo);
  }
}
