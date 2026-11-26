import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { environment } from '@env/environment';
import type { PesoRequest, PesoResponse, ResumenDiarioResponse, SeriePesoResponse } from '../models';
import { diasEntre } from '../util/fechas';

/** Días que puede abarcar GET /seguimiento/peso (desde y hasta incluidos). */
export const MAX_DIAS_SERIE_PESO = 366;

/**
 * Seguimiento (NutriSport_API.md §6 Seguimiento): resumen diario y peso. Los insights y las
 * estadísticas llegan en sus pasos.
 */
@Injectable({ providedIn: 'root' })
export class SeguimientoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/seguimiento`;

  /**
   * GET /seguimiento/resumen: objetivo del día (base del perfil más el gasto de los entrenamientos
   * que cuentan), consumido, restante, exceso, porcentajes, comidas y entrenamientos. Sin fecha, el
   * de hoy. 422 PERFIL_REQUERIDO si no hay perfil.
   */
  resumen(fecha?: string | null): Observable<ResumenDiarioResponse> {
    const params = fecha ? new HttpParams().set('fecha', fecha) : undefined;
    return this.http.get<ResumenDiarioResponse>(`${this.url}/resumen`, { params });
  }

  /**
   * POST /seguimiento/peso (201). Si ya hay un pesaje ese día, lo sustituye. Si es el más reciente,
   * actualiza el peso del perfil y recalcula sus objetivos.
   */
  registrarPeso(req: PesoRequest): Observable<PesoResponse> {
    const cuerpo: PesoRequest = { fecha: req.fecha, pesoKg: Number(req.pesoKg) };
    return this.http.post<PesoResponse>(`${this.url}/peso`, cuerpo);
  }

  /** DELETE /seguimiento/peso/{id} (204). Si era el más reciente, el perfil toma el anterior. */
  eliminarPeso(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/peso/${encodeURIComponent(id)}`);
  }

  /**
   * GET /seguimiento/peso: pesajes de `desde` a `hasta` ("AAAA-MM-DD", ambos incluidos) en orden
   * cronológico, con la media móvil de 7 días. Como mucho 366 días: un rango mayor o al revés no
   * llega a pedirse y falla con RangeError.
   */
  seriePeso(desde: string, hasta: string): Observable<SeriePesoResponse> {
    const dias = diasEntre(desde, hasta) + 1;
    if (dias < 1 || dias > MAX_DIAS_SERIE_PESO) {
      return throwError(
        () =>
          new RangeError(`El rango de la serie de peso debe ir de 1 a ${MAX_DIAS_SERIE_PESO} días (es de ${dias}).`),
      );
    }
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return this.http.get<SeriePesoResponse>(`${this.url}/peso`, { params });
  }
}
