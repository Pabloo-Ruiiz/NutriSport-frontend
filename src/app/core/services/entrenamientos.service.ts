import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { environment } from '@env/environment';
import type {
  EntrenamientoRequest,
  EntrenamientoResponse,
  EstadoEntrenamiento,
  RelacionNutricionResponse,
} from '../models';
import { diasEntre } from '../util/fechas';

/** Días que puede abarcar GET /entrenamientos (desde y hasta incluidos). */
export const MAX_DIAS_ENTRENAMIENTOS = 92;

/** Días que puede abarcar GET /entrenamientos/relacion-nutricion (desde y hasta incluidos). */
export const MAX_DIAS_RELACION_NUTRICION = 366;

/**
 * Entrenamientos (NutriSport_API.md §6 Actividad): realizados y planificados. Cada cambio recalcula
 * el gasto estimado y el objetivo del día en el backend. El catálogo de tipos está en
 * TiposActividadService.
 */
@Injectable({ providedIn: 'root' })
export class EntrenamientosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/entrenamientos`;

  /**
   * GET /entrenamientos: de `desde` a `hasta` (ambos incluidos, como mucho 92 días) en orden
   * cronológico, opcionalmente de un estado. Un rango mayor o al revés no llega a pedirse y falla
   * con RangeError.
   */
  listar(desde: string, hasta: string, estado?: EstadoEntrenamiento | null): Observable<EntrenamientoResponse[]> {
    const dias = diasEntre(desde, hasta) + 1;
    if (dias < 1 || dias > MAX_DIAS_ENTRENAMIENTOS) {
      return throwError(
        () => new RangeError(`Los entrenamientos deben abarcar de 1 a ${MAX_DIAS_ENTRENAMIENTOS} días (son ${dias}).`),
      );
    }
    let params = new HttpParams().set('desde', desde).set('hasta', hasta);
    if (estado) params = params.set('estado', estado);
    return this.http.get<EntrenamientoResponse[]>(this.url, { params });
  }

  /** POST /entrenamientos (201). Sin estado: PLANIFICADO si la fecha es futura, REALIZADO si no. */
  crear(req: EntrenamientoRequest): Observable<EntrenamientoResponse> {
    return this.http.post<EntrenamientoResponse>(this.url, cuerpoEntrenamiento(req));
  }

  /** PUT /entrenamientos/{id}: sustituye todos sus datos (sin estado, conserva el actual). */
  editar(id: string, req: EntrenamientoRequest): Observable<EntrenamientoResponse> {
    return this.http.put<EntrenamientoResponse>(`${this.url}/${encodeURIComponent(id)}`, cuerpoEntrenamiento(req));
  }

  /** DELETE /entrenamientos/{id} (204). */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${encodeURIComponent(id)}`);
  }

  /**
   * Cambia solo el estado (p. ej. marcar como realizado u omitido). Como el PUT sustituye todo, se
   * reenvía el entrenamiento completo con el estado nuevo.
   */
  marcarEstado(e: EntrenamientoResponse, estado: EstadoEntrenamiento): Observable<EntrenamientoResponse> {
    return this.editar(e.id, { ...peticionDesdeEntrenamiento(e), estado });
  }

  /**
   * GET /entrenamientos/relacion-nutricion: media diaria consumida y objetivo medio en los días con
   * entreno (planificado o realizado) frente a los de descanso (solo días con alguna comida), y
   * cuántas sesiones tienen al menos 25 g de proteína en las 2 h siguientes. Como mucho 366 días: un
   * rango mayor o al revés no llega a pedirse y falla con RangeError.
   */
  relacionNutricion(desde: string, hasta: string): Observable<RelacionNutricionResponse> {
    const dias = diasEntre(desde, hasta) + 1;
    if (dias < 1 || dias > MAX_DIAS_RELACION_NUTRICION) {
      return throwError(
        () =>
          new RangeError(
            `La relación con la alimentación debe abarcar de 1 a ${MAX_DIAS_RELACION_NUTRICION} días (son ${dias}).`,
          ),
      );
    }
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return this.http.get<RelacionNutricionResponse>(`${this.url}/relacion-nutricion`, { params });
  }
}

/** EntrenamientoRequest con los datos de un entrenamiento guardado (para reenviarlo con el PUT). */
export function peticionDesdeEntrenamiento(e: EntrenamientoResponse): EntrenamientoRequest {
  const req: EntrenamientoRequest = {
    tipoActividadCodigo: e.tipoActividadCodigo,
    fechaHora: e.fechaHora,
    duracionMin: e.duracionMin,
    intensidad: e.intensidad,
    estado: e.estado,
  };
  if (e.rpe !== null) req.rpe = e.rpe;
  if (e.distanciaKm !== null) req.distanciaKm = e.distanciaKm;
  if (e.notas) req.notas = e.notas;
  return req;
}

/** Solo los campos del EntrenamientoRequest; los opcionales, solo si tienen valor. */
export function cuerpoEntrenamiento(req: EntrenamientoRequest): EntrenamientoRequest {
  const cuerpo: EntrenamientoRequest = {
    tipoActividadCodigo: req.tipoActividadCodigo,
    fechaHora: req.fechaHora,
    duracionMin: Number(req.duracionMin),
    intensidad: req.intensidad,
  };
  if (req.estado) cuerpo.estado = req.estado;
  if (req.rpe !== undefined && req.rpe !== null) cuerpo.rpe = Number(req.rpe);
  if (req.distanciaKm !== undefined && req.distanciaKm !== null) cuerpo.distanciaKm = Number(req.distanciaKm);
  const notas = req.notas?.trim();
  if (notas) cuerpo.notas = notas;
  return cuerpo;
}
