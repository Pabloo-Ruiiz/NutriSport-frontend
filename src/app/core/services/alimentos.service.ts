import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, shareReplay, tap, throwError } from 'rxjs';

import { environment } from '@env/environment';
import type { AlimentoRequest, AlimentoResponse, AlimentoResumenResponse, Pagina, PorcionCasera } from '../models';

/** Caracteres mínimos para buscar: con menos no se llama al backend. */
export const MIN_CARACTERES_BUSQUEDA = 2;
/** Caracteres máximos de `q` (NutriSport_API.md §7.2). */
export const MAX_CARACTERES_BUSQUEDA = 60;
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
 * Catálogo de alimentos (NutriSport_API.md §6 Catálogo y §7.2): búsqueda, detalle, recientes,
 * frecuentes y alimentos propios (privados del usuario).
 *
 * No hay listado de "mis alimentos" (§11.7): GET /alimentos exige `q` y los propios llegan con
 * fuente = USUARIO.
 */
@Injectable({ providedIn: 'root' })
export class AlimentosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/alimentos`;

  /** Detalles pedidos en esta sesión (las porciones y los alérgenos casi no cambian). */
  private readonly detalles = new Map<string, Observable<AlimentoResponse>>();

  /**
   * GET /alimentos?q=…: tolera tildes, mayúsculas y errores de escritura; los más parecidos van
   * primero. Con menos de 2 caracteres (sin contar espacios) no llama y devuelve una página vacía;
   * con más de 60 se recorta.
   */
  buscar(q: string, opciones: OpcionesBusqueda = {}): Observable<Pagina<AlimentoResumenResponse>> {
    const texto = q.trim().slice(0, MAX_CARACTERES_BUSQUEDA);
    const page = Math.max(0, Math.floor(opciones.page ?? 0));
    const size = Math.min(MAX_TAMANO_PAGINA, Math.max(1, Math.floor(opciones.size ?? 20)));

    if (texto.length < MIN_CARACTERES_BUSQUEDA) {
      return of({ content: [], page, size, totalElements: 0, totalPages: 0 });
    }

    let params = new HttpParams().set('q', texto).set('page', page).set('size', size);
    if (opciones.categoria) params = params.set('categoria', opciones.categoria);
    return this.http.get<Pagina<AlimentoResumenResponse>>(this.url, { params });
  }

  /**
   * GET /alimentos/{id}: valores nutricionales, porciones caseras, alérgenos y aptitudes. Se
   * guarda en memoria mientras dure la sesión; un error no se guarda. 404 si no existe o es
   * privado de otro usuario.
   */
  detalle(id: string): Observable<AlimentoResponse> {
    let detalle$ = this.detalles.get(id);
    if (!detalle$) {
      detalle$ = this.http.get<AlimentoResponse>(`${this.url}/${encodeURIComponent(id)}`).pipe(
        catchError((error: unknown) => {
          this.detalles.delete(id);
          return throwError(() => error);
        }),
        shareReplay(1),
      );
      this.detalles.set(id, detalle$);
    }
    return detalle$;
  }

  /** GET /alimentos/recientes: los 20 últimos alimentos distintos de tus comidas. */
  recientes(): Observable<AlimentoResumenResponse[]> {
    return this.http.get<AlimentoResumenResponse[]>(`${this.url}/recientes`);
  }

  /** GET /alimentos/frecuentes: los 20 que más has registrado en los últimos 90 días. */
  frecuentes(): Observable<AlimentoResumenResponse[]> {
    return this.http.get<AlimentoResumenResponse[]>(`${this.url}/frecuentes`);
  }

  /**
   * POST /alimentos (201): alimento privado, sin validar y con los alérgenos sin revisar. Vegano
   * implica vegetariano y vegetariano implica pescetariano.
   */
  crear(req: AlimentoRequest): Observable<AlimentoResponse> {
    return this.http
      .post<AlimentoResponse>(this.url, cuerpoAlimento(req))
      .pipe(tap((alimento) => this.detalles.set(alimento.id, of(alimento))));
  }

  /** PUT /alimentos/{id}: mismas reglas que al crearlo. 404 si no es un alimento propio activo. */
  editar(id: string, req: AlimentoRequest): Observable<AlimentoResponse> {
    return this.http
      .put<AlimentoResponse>(`${this.url}/${encodeURIComponent(id)}`, cuerpoAlimento(req))
      .pipe(tap((alimento) => this.detalles.set(alimento.id, of(alimento))));
  }

  /** DELETE /alimentos/{id} (204). Si ya se usó en alguna comida, el backend solo lo desactiva. */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${encodeURIComponent(id)}`).pipe(tap(() => this.detalles.delete(id)));
  }
}

/**
 * AlimentoRequest solo con sus campos (el backend rechaza propiedades desconocidas). Los opcionales
 * vacíos no se envían; los números van como number. Las aptitudes se hacen coherentes: vegano
 * implica vegetariano, y vegetariano implica pescetariano.
 */
export function cuerpoAlimento(req: AlimentoRequest): AlimentoRequest {
  const aptoVegano = req.aptoVegano === true;
  const aptoVegetariano = aptoVegano || req.aptoVegetariano === true;
  const cuerpo: AlimentoRequest = {
    nombre: req.nombre.trim(),
    categoriaId: req.categoriaId,
    kcal100: Number(req.kcal100),
    proteinas100: Number(req.proteinas100),
    carbohidratos100: Number(req.carbohidratos100),
    grasas100: Number(req.grasas100),
    unidadBase: req.unidadBase,
    contieneLactosa: req.contieneLactosa === true,
    aptoVegano,
    aptoVegetariano,
    aptoPescetariano: aptoVegetariano || req.aptoPescetariano === true,
  };
  const marca = req.marca?.trim();
  if (marca) cuerpo.marca = marca;
  if (req.preparacion) cuerpo.preparacion = req.preparacion;
  for (const campo of ['azucares100', 'saturadas100', 'fibra100', 'sal100'] as const) {
    const valor = req[campo];
    if (valor !== null && valor !== undefined && Number.isFinite(Number(valor))) cuerpo[campo] = Number(valor);
  }
  if (req.porciones?.length) {
    cuerpo.porciones = req.porciones.map((p): PorcionCasera => ({ nombre: p.nombre.trim(), gramos: Number(p.gramos) }));
  }
  if (req.alergenosContiene?.length) cuerpo.alergenosContiene = [...req.alergenosContiene];
  if (req.alergenosTrazas?.length) cuerpo.alergenosTrazas = [...req.alergenosTrazas];
  return cuerpo;
}
