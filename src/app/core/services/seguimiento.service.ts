import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { environment } from '@env/environment';
import type {
  Agrupacion,
  ComparativaResponse,
  EstadisticasResponse,
  InsightResponse,
  PesoRequest,
  PesoResponse,
  ResumenDiarioResponse,
  SeriePesoResponse,
} from '../models';
import { diasEntre } from '../util/fechas';

/** Días que puede abarcar GET /seguimiento/peso (desde y hasta incluidos). */
export const MAX_DIAS_SERIE_PESO = 366;

/** Días que puede abarcar GET /seguimiento/estadisticas (desde y hasta incluidos). */
export const MAX_DIAS_ESTADISTICAS = 366;

/** Periodos de GET /seguimiento/comparativa: semana (de lunes a hoy) o mes (del día 1 a hoy). */
export type PeriodoComparativa = Extract<Agrupacion, 'SEMANA' | 'MES'>;

/**
 * Seguimiento (NutriSport_API.md §6 Seguimiento): resumen diario, peso, estadísticas de un periodo,
 * comparativa con el periodo anterior e insights.
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

  /**
   * GET /seguimiento/estadisticas: serie de energía y macros (media diaria de cada periodo) frente al
   * objetivo, agrupada por día (por defecto), semana ISO o mes; medias, adherencia, reparto de macros,
   * kcal por tipo de comida y los 10 alimentos más consumidos. Como mucho 366 días: un rango mayor o
   * al revés no llega a pedirse y falla con RangeError.
   */
  estadisticas(desde: string, hasta: string, agrupacion?: Agrupacion | null): Observable<EstadisticasResponse> {
    const dias = diasEntre(desde, hasta) + 1;
    if (dias < 1 || dias > MAX_DIAS_ESTADISTICAS) {
      return throwError(
        () => new RangeError(`Las estadísticas deben abarcar de 1 a ${MAX_DIAS_ESTADISTICAS} días (son ${dias}).`),
      );
    }
    let params = new HttpParams().set('desde', desde).set('hasta', hasta);
    if (agrupacion) params = params.set('agrupacion', agrupacion);
    return this.http.get<EstadisticasResponse>(`${this.url}/estadisticas`, { params });
  }

  /**
   * GET /seguimiento/comparativa: periodo actual frente al anterior. SEMANA (por defecto): de lunes a
   * hoy frente a la semana anterior completa; MES: del día 1 a hoy frente al mes anterior completo.
   * Estadísticas sin serie, variación de la media diaria en % (nula sin datos anteriores) y de la
   * adherencia en puntos.
   */
  comparativa(periodo?: PeriodoComparativa | null): Observable<ComparativaResponse> {
    const params = periodo ? new HttpParams().set('periodo', periodo) : undefined;
    return this.http.get<ComparativaResponse>(`${this.url}/comparativa`, { params });
  }

  /** GET /seguimiento/insights: insights vigentes, los más recientes primero (vacía si están desactivados). */
  insights(): Observable<InsightResponse[]> {
    return this.http.get<InsightResponse[]>(`${this.url}/insights`);
  }
}
