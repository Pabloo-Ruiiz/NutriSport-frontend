import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import type {
  ActualizarComidaPlanificadaRequest,
  ActualizarMenuRequest,
  AlternativaResponse,
  AnadirComidaRequest,
  DuplicarMenuRequest,
  GenerarMenuRequest,
  MenuResponse,
  MenuResumenResponse,
  Pagina,
  RegistroComidaResponse,
  SugerenciaIaRequest,
  SugerenciaIaResponse,
  TipoComida,
} from '../models';

/** Consulta de GET /menus (docs/api/menus.md §6). */
export interface FiltrosMenus {
  favorito?: boolean | null;
  /** "AAAA-MM-DD". */
  desde?: string | null;
  page: number;
  /** Como mucho 50 por página. */
  size: number;
}

/**
 * Menús planificados (Ampliación, docs/api/menus.md §6 y §7.5).
 *
 * Casi todas las operaciones de edición devuelven el menú completo (`MenuResponse`): quien las
 * llame debe sustituir su estado con la respuesta, sin recalcular nada en el cliente.
 */
@Injectable({ providedIn: 'root' })
export class MenusService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/menus`;

  // ---- Menús

  /** Mis menús, el que empieza más tarde primero. Solo envía los filtros con valor. */
  listar(filtros: FiltrosMenus): Observable<Pagina<MenuResumenResponse>> {
    let params = new HttpParams();
    if (typeof filtros.favorito === 'boolean') params = params.set('favorito', filtros.favorito);
    const desde = filtros.desde?.trim();
    if (desde) params = params.set('desde', desde);
    params = params.set('page', filtros.page).set('size', filtros.size);
    return this.http.get<Pagina<MenuResumenResponse>>(this.url, { params });
  }

  /** Genera un menú DIARIO o SEMANAL con el motor de reglas (201). */
  generar(req: GenerarMenuRequest): Observable<MenuResponse> {
    return this.http.post<MenuResponse>(`${this.url}/generar`, req);
  }

  detalle(id: string): Observable<MenuResponse> {
    return this.http.get<MenuResponse>(this.ruta(id));
  }

  /** Cambia nombre, favorito o estado: solo los campos presentes. */
  actualizar(id: string, req: ActualizarMenuRequest): Observable<MenuResponse> {
    return this.http.patch<MenuResponse>(this.ruta(id), req);
  }

  /** Borra el menú con sus comidas planificadas (las registradas se conservan). */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(this.ruta(id));
  }

  /** Copia el menú desde otra fecha de inicio (201). */
  duplicar(id: string, req: DuplicarMenuRequest): Observable<MenuResponse> {
    return this.http.post<MenuResponse>(`${this.ruta(id)}/duplicar`, req);
  }

  /** Vuelve a elegir las comidas no bloqueadas ni consumidas. */
  regenerar(id: string): Observable<MenuResponse> {
    return this.http.post<MenuResponse>(`${this.ruta(id)}/regenerar`, null);
  }

  // ---- Comidas del menú

  /** Recetas que se pueden añadir a una franja de un día (como mucho 50). */
  recetasDisponibles(fecha: string, tipoComida: TipoComida, q?: string | null): Observable<AlternativaResponse[]> {
    let params = new HttpParams().set('fecha', fecha).set('tipoComida', tipoComida);
    const texto = q?.trim();
    if (texto) params = params.set('q', texto);
    return this.http.get<AlternativaResponse[]>(`${this.url}/recetas-disponibles`, { params });
  }

  /** Hasta 3 alternativas para una comida. */
  alternativas(id: string, comidaId: string): Observable<AlternativaResponse[]> {
    return this.http.get<AlternativaResponse[]>(`${this.rutaComida(id, comidaId)}/alternativas`);
  }

  anadirComida(id: string, req: AnadirComidaRequest): Observable<MenuResponse> {
    return this.http.post<MenuResponse>(`${this.ruta(id)}/comidas`, req);
  }

  /** Cambia receta, raciones, día, franja o bloqueo (los campos ausentes no cambian). */
  cambiarComida(id: string, comidaId: string, req: ActualizarComidaPlanificadaRequest): Observable<MenuResponse> {
    return this.http.put<MenuResponse>(this.rutaComida(id, comidaId), req);
  }

  /** 204 sin cuerpo: después hay que recargar el menú. */
  quitarComida(id: string, comidaId: string): Observable<void> {
    return this.http.delete<void>(this.rutaComida(id, comidaId));
  }

  /** Registra la comida planificada como consumida (201). `hora` en "HH:mm"; sin ella, la del servidor. */
  registrarComida(id: string, comidaId: string, hora?: string | null): Observable<RegistroComidaResponse> {
    let params = new HttpParams();
    const h = hora?.trim();
    if (h) params = params.set('hora', h.slice(0, 5));
    return this.http.post<RegistroComidaResponse>(`${this.rutaComida(id, comidaId)}/registrar`, null, { params });
  }

  /** Un ajuste propuesto por la IA y validado por el backend (`valida`). */
  sugerenciaIa(id: string, comidaId: string, req: SugerenciaIaRequest = {}): Observable<SugerenciaIaResponse> {
    return this.http.post<SugerenciaIaResponse>(`${this.rutaComida(id, comidaId)}/sugerencia-ia`, req);
  }

  aplicarSugerencia(id: string, comidaId: string, sugerenciaId: string): Observable<MenuResponse> {
    return this.http.post<MenuResponse>(`${this.rutaComida(id, comidaId)}/sugerencia-ia/aplicar`, { sugerenciaId });
  }

  private ruta(id: string): string {
    return `${this.url}/${encodeURIComponent(id)}`;
  }

  private rutaComida(id: string, comidaId: string): string {
    return `${this.ruta(id)}/comidas/${encodeURIComponent(comidaId)}`;
  }
}
