import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '@env/environment';
import type {
  AlimentoRequest,
  AlimentoResponse,
  CategoriaRequest,
  CategoriaResponse,
  FuenteAlimento,
  Pagina,
  ResultadoImportacion,
  RevisionAlergenosRequest,
  TipoCategoria,
  Visibilidad,
} from '../../models';
import { cuerpoAlimento } from '../alimentos.service';
import { CategoriasService } from '../categorias.service';

/** Tamaño de página máximo que admite GET /admin/alimentos. */
export const MAX_TAMANO_PAGINA_CATALOGO = 100;
/** Límites de la importación CSV (docs/api/admin.md §7.7). */
export const MAX_FILAS_IMPORTACION = 5000;
export const MAX_BYTES_IMPORTACION = 10 * 1024 * 1024;
/** Fuentes del catálogo público, para crear o importar (USUARIO y OCR son de los usuarios). */
export const FUENTES_CATALOGO: readonly FuenteAlimento[] = ['ADMIN', 'BEDCA', 'USDA', 'OPEN_FOOD_FACTS'];

export interface FiltroAlimentosAdmin {
  /** Texto libre. Vacío = sin filtro. */
  q?: string | null;
  fuente?: FuenteAlimento | null;
  /** false = la cola "Pendientes de revisar" (alérgenos sin revisar). */
  revisados?: boolean | null;
  visibilidad?: Visibilidad | null;
  activo?: boolean | null;
  /** Página desde 0. */
  page: number;
  /** Tamaño de página (como mucho 100). */
  size: number;
  /** "campo,asc|desc" (uno o varios). Sin él, por nombre. */
  sort?: string | readonly string[] | null;
}

/**
 * Catálogo desde la administración (docs/api/admin.md §6 Admin y §7.7): alimentos (todos, también
 * los privados de usuarios y los desactivados), revisión de alérgenos, importación CSV y
 * categorías. Solo rol ADMIN; cada acción queda auditada en el backend.
 *
 * Las categorías se leen con GET /categorias (no hay listado de administración) y su caché se
 * invalida tras crear, editar o borrar.
 */
@Injectable({ providedIn: 'root' })
export class AdminCatalogoService {
  private readonly http = inject(HttpClient);
  private readonly categoriasService = inject(CategoriasService);
  private readonly url = `${environment.apiUrl}/admin`;

  // ---- Alimentos

  /** GET /admin/alimentos: filtros opcionales y combinables; por nombre por defecto. */
  alimentos(filtro: FiltroAlimentosAdmin): Observable<Pagina<AlimentoResponse>> {
    const page = Math.max(0, Math.floor(filtro.page) || 0);
    const size = Math.min(MAX_TAMANO_PAGINA_CATALOGO, Math.max(1, Math.floor(filtro.size) || 20));

    let params = new HttpParams().set('page', page).set('size', size);
    const q = filtro.q?.trim();
    if (q) params = params.set('q', q);
    if (filtro.fuente) params = params.set('fuente', filtro.fuente);
    if (typeof filtro.revisados === 'boolean') params = params.set('revisados', filtro.revisados);
    if (filtro.visibilidad) params = params.set('visibilidad', filtro.visibilidad);
    if (typeof filtro.activo === 'boolean') params = params.set('activo', filtro.activo);
    const sort = typeof filtro.sort === 'string' ? [filtro.sort] : (filtro.sort ?? []);
    for (const orden of sort) if (orden) params = params.append('sort', orden);

    return this.http.get<Pagina<AlimentoResponse>>(`${this.url}/alimentos`, { params });
  }

  /**
   * POST /admin/alimentos?fuente=…&referenciaExterna=… (201): alimento público, validado y con los
   * alérgenos sin revisar.
   */
  crearAlimento(req: AlimentoRequest, fuente: FuenteAlimento, referenciaExterna?: string | null): Observable<AlimentoResponse> {
    let params = new HttpParams().set('fuente', fuente);
    const referencia = referenciaExterna?.trim();
    if (referencia) params = params.set('referenciaExterna', referencia);
    return this.http.post<AlimentoResponse>(`${this.url}/alimentos`, cuerpoAlimento(req), { params });
  }

  /** PUT /admin/alimentos/{id}: cualquiera, también los privados. Si cambian los alérgenos o la lactosa, quedan sin revisar. */
  editarAlimento(id: string, req: AlimentoRequest): Observable<AlimentoResponse> {
    return this.http.put<AlimentoResponse>(`${this.url}/alimentos/${encodeURIComponent(id)}`, cuerpoAlimento(req));
  }

  /** DELETE /admin/alimentos/{id} (204). Si ya se usó en comidas, el backend solo lo desactiva. */
  eliminarAlimento(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/alimentos/${encodeURIComponent(id)}`);
  }

  /** PUT /admin/alimentos/{id}/alergenos: sustituye contiene, trazas y lactosa, y lo marca como revisado. */
  revisarAlergenos(id: string, req: RevisionAlergenosRequest): Observable<AlimentoResponse> {
    const cuerpo: RevisionAlergenosRequest = {
      alergenosContiene: [...new Set(req.alergenosContiene)],
      // Lo que ya "contiene" no es una traza.
      alergenosTrazas: [...new Set(req.alergenosTrazas)].filter((a) => !req.alergenosContiene.includes(a)),
      contieneLactosa: req.contieneLactosa === true,
    };
    return this.http.put<AlimentoResponse>(`${this.url}/alimentos/${encodeURIComponent(id)}/alergenos`, cuerpo);
  }

  /**
   * POST /admin/alimentos/importar?fuente=…&referencia=… con multipart/form-data (campo `archivo`):
   * CSV UTF-8, máx. 5000 filas y 10 MB. Las filas con errores no se importan y vuelven en
   * `errores` (campo = fila). 400 si falta la cabecera o alguna columna; 413 si es demasiado grande.
   */
  importar(archivo: File, fuente: FuenteAlimento, referencia?: string | null): Observable<ResultadoImportacion> {
    let params = new HttpParams().set('fuente', fuente);
    const ref = referencia?.trim();
    if (ref) params = params.set('referencia', ref);
    const cuerpo = new FormData();
    cuerpo.append('archivo', archivo, archivo.name);
    // Sin Content-Type: el navegador pone multipart/form-data con su boundary.
    return this.http.post<ResultadoImportacion>(`${this.url}/alimentos/importar`, cuerpo, { params });
  }

  // ---- Categorías

  /** GET /categorias?tipo=… (cacheado por CategoriasService). */
  categorias(tipo: TipoCategoria): Observable<CategoriaResponse[]> {
    return this.categoriasService.listar(tipo);
  }

  /** POST /admin/categorias (201). 409 si ya hay otra del mismo tipo con ese nombre. */
  crearCategoria(req: CategoriaRequest): Observable<CategoriaResponse> {
    return this.http
      .post<CategoriaResponse>(`${this.url}/categorias`, cuerpoCategoria(req))
      .pipe(tap(() => this.categoriasService.invalidar(req.tipo)));
  }

  /** PUT /admin/categorias/{id}. 409 si el nombre ya existe o si se cambia el tipo de una con elementos. */
  editarCategoria(id: string, req: CategoriaRequest): Observable<CategoriaResponse> {
    return this.http
      .put<CategoriaResponse>(`${this.url}/categorias/${encodeURIComponent(id)}`, cuerpoCategoria(req))
      // Puede haber cambiado de tipo: se invalidan los dos.
      .pipe(tap(() => this.categoriasService.invalidar()));
  }

  /** DELETE /admin/categorias/{id} (204). 409 si tiene alimentos o subcategorías. */
  eliminarCategoria(id: string, tipo?: TipoCategoria): Observable<void> {
    return this.http
      .delete<void>(`${this.url}/categorias/${encodeURIComponent(id)}`)
      .pipe(tap(() => this.categoriasService.invalidar(tipo)));
  }
}

/**
 * CategoriaRequest solo con sus campos; los opcionales vacíos no se envían. Solo las categorías de
 * alimentos tienen sección de la compra.
 */
export function cuerpoCategoria(req: CategoriaRequest): CategoriaRequest {
  const cuerpo: CategoriaRequest = { nombre: req.nombre.trim(), tipo: req.tipo, orden: Number(req.orden) };
  if (req.padreId) cuerpo.padreId = req.padreId;
  const seccion = req.seccionCompra?.trim();
  if (seccion && req.tipo === 'ALIMENTO') cuerpo.seccionCompra = seccion;
  return cuerpo;
}
