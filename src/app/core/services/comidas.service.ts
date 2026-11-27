import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { environment } from '@env/environment';
import type {
  AlimentoRegistradoRequest,
  ComidasDiaResponse,
  DuplicarComidaRequest,
  RegistrarRecetaRequest,
  RegistroComidaRequest,
  RegistroComidaResponse,
  TipoComida,
} from '../models';
import { diasEntre } from '../util/fechas';

/** Días que puede abarcar GET /comidas (desde y hasta incluidos). */
export const MAX_DIAS_HISTORIAL = 92;

/**
 * Comidas (NutriSport_API.md §6 Comidas y §7.2): registro manual, detalle, edición, duplicado,
 * historial y comidas de un día. Las cantidades se convierten a gramos en el backend y los
 * nutrientes se guardan como instantánea del catálogo. Los `avisos` de la respuesta (restricciones
 * del usuario) no bloquean.
 */
@Injectable({ providedIn: 'root' })
export class ComidasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/comidas`;

  /** POST /comidas (201). Hasta 40 alimentos; fechas pasadas y hasta mañana. */
  registrar(req: RegistroComidaRequest): Observable<RegistroComidaResponse> {
    return this.http.post<RegistroComidaResponse>(this.url, cuerpoComida(req));
  }

  /**
   * POST /comidas/desde-receta (201): comida con origen RECETA a partir de las raciones de una
   * receta (> 0 y ≤ 10, admite decimales). 422 NUTRICION_INCOMPLETA si la receta no tiene cálculo
   * suficiente.
   */
  registrarReceta(req: RegistrarRecetaRequest): Observable<RegistroComidaResponse> {
    const cuerpo: RegistrarRecetaRequest = {
      recetaId: req.recetaId,
      raciones: req.raciones,
      fecha: req.fecha,
      tipoComida: req.tipoComida,
    };
    return this.http.post<RegistroComidaResponse>(`${this.url}/desde-receta`, cuerpo);
  }

  /** GET /comidas/{id}: con sus alimentos, totales y avisos. */
  detalle(id: string): Observable<RegistroComidaResponse> {
    return this.http.get<RegistroComidaResponse>(`${this.url}/${encodeURIComponent(id)}`);
  }

  /** PUT /comidas/{id}: sustituye sus datos y todos sus alimentos. */
  editar(id: string, req: RegistroComidaRequest): Observable<RegistroComidaResponse> {
    return this.http.put<RegistroComidaResponse>(`${this.url}/${encodeURIComponent(id)}`, cuerpoComida(req));
  }

  /** DELETE /comidas/{id} (204): borra la comida y sus alimentos. */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${encodeURIComponent(id)}`);
  }

  /**
   * POST /comidas/{id}/duplicar (201): comida nueva con origen COPIA y los nutrientes actuales del
   * catálogo. Sin tipoComida se conserva el de la original.
   */
  duplicar(id: string, req: DuplicarComidaRequest): Observable<RegistroComidaResponse> {
    const cuerpo: DuplicarComidaRequest = { fecha: req.fecha };
    if (req.tipoComida) cuerpo.tipoComida = req.tipoComida;
    return this.http.post<RegistroComidaResponse>(`${this.url}/${encodeURIComponent(id)}/duplicar`, cuerpo);
  }

  /**
   * GET /comidas: días con comidas de `desde` a `hasta` (ambos incluidos, como mucho 92 días),
   * opcionalmente de un tipo. Los días sin comidas no aparecen. Un rango mayor o al revés no llega
   * a pedirse y falla con RangeError.
   */
  historial(desde: string, hasta: string, tipo?: TipoComida | null): Observable<ComidasDiaResponse[]> {
    const dias = diasEntre(desde, hasta) + 1;
    if (dias < 1 || dias > MAX_DIAS_HISTORIAL) {
      return throwError(
        () => new RangeError(`El historial debe abarcar de 1 a ${MAX_DIAS_HISTORIAL} días (son ${dias}).`),
      );
    }
    let params = new HttpParams().set('desde', desde).set('hasta', hasta);
    if (tipo) params = params.set('tipo', tipo);
    return this.http.get<ComidasDiaResponse[]>(this.url, { params });
  }

  /** GET /comidas/dia/{fecha}: comidas del día en orden cronológico y sus totales. */
  dia(fecha: string): Observable<ComidasDiaResponse> {
    return this.http.get<ComidasDiaResponse>(`${this.url}/dia/${encodeURIComponent(fecha)}`);
  }
}

/**
 * RegistroComidaRequest solo con sus campos: hora y notas solo si tienen valor; cada alimento con
 * alimentoId o codigoBarras (no los dos), cantidad (number) y unidad.
 */
export function cuerpoComida(req: RegistroComidaRequest): RegistroComidaRequest {
  const cuerpo: RegistroComidaRequest = {
    fecha: req.fecha,
    tipoComida: req.tipoComida,
    alimentos: req.alimentos.map((a): AlimentoRegistradoRequest => {
      const alimento: AlimentoRegistradoRequest = { cantidad: Number(a.cantidad), unidad: a.unidad };
      if (a.alimentoId) alimento.alimentoId = a.alimentoId;
      else if (a.codigoBarras) alimento.codigoBarras = a.codigoBarras;
      return alimento;
    }),
  };
  if (req.hora) cuerpo.hora = req.hora;
  const notas = req.notas?.trim();
  if (notas) cuerpo.notas = notas;
  return cuerpo;
}
