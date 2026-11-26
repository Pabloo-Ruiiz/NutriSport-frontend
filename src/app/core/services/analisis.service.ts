import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, TimeoutError, switchMap, takeWhile, tap, timer } from 'rxjs';

import { environment } from '@env/environment';
import type {
  AnalisisResponse,
  ConfirmarAnalisisRequest,
  RegistroComidaResponse,
  TipoComida,
  UrlImagenResponse,
} from '../models';

/** Intervalo entre consultas del estado de un análisis (ms). */
export const INTERVALO_ANALISIS = 1500;
/** Tiempo máximo esperando a que un análisis termine (ms). */
export const ESPERA_MAX_ANALISIS = 60_000;

/**
 * Análisis de fotos con IA (docs/api/analisis.md §6 Análisis y §7.1): subida de la foto ya
 * comprimida, seguimiento del estado, URL de la foto, confirmación como comida y descarte.
 */
@Injectable({ providedIn: 'root' })
export class AnalisisService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/analisis`;

  /**
   * POST /analisis/imagenes (202, análisis PENDIENTE). La foto va en el campo `imagen` como
   * `foto.jpg`; tipoComida y descripcion van en la query. El Content-Type con el boundary lo pone el
   * navegador.
   */
  subir(foto: Blob, tipoComida: TipoComida, descripcion?: string | null): Observable<AnalisisResponse> {
    const datos = new FormData();
    datos.append('imagen', foto, 'foto.jpg');
    let params = new HttpParams().set('tipoComida', tipoComida);
    const texto = descripcion?.trim();
    if (texto) params = params.set('descripcion', texto);
    return this.http.post<AnalisisResponse>(`${this.url}/imagenes`, datos, { params });
  }

  /** GET /analisis/{id}: estado y, si está COMPLETADO, candidatos y total estimado. */
  consultar(id: string): Observable<AnalisisResponse> {
    return this.http.get<AnalisisResponse>(this.ruta(id));
  }

  /**
   * Consulta el análisis cada 1,5 s y emite cada estado hasta el primero que no sea PENDIENTE ni
   * PROCESANDO (incluido), y termina. Falla con TimeoutError si pasan 60 s. Desuscribirse (al salir
   * de la pantalla) cancela el sondeo.
   *
   * El límite es total: `timeout(60000)` de RxJS 7 equivale a `{ each: 60000 }` (plazo entre
   * emisiones) y, con un valor cada 1,5 s, no saltaría nunca. Por eso se corta en el tic del minuto.
   */
  seguir(id: string): Observable<AnalisisResponse> {
    return timer(0, INTERVALO_ANALISIS).pipe(
      tap((tic) => {
        if (tic * INTERVALO_ANALISIS >= ESPERA_MAX_ANALISIS) throw new TimeoutError();
      }),
      switchMap(() => this.consultar(id)),
      takeWhile((a) => a.estado === 'PENDIENTE' || a.estado === 'PROCESANDO', true),
    );
  }

  /** GET /analisis/{id}/imagen: URL prefirmada que caduca en minutos; pídela al mostrarla. */
  urlImagen(id: string): Observable<UrlImagenResponse> {
    return this.http.get<UrlImagenResponse>(`${this.ruta(id)}/imagen`);
  }

  /** POST /analisis/{id}/confirmar (201): registra la comida con origen FOTO. Solo COMPLETADO. */
  confirmar(id: string, req: ConfirmarAnalisisRequest): Observable<RegistroComidaResponse> {
    return this.http.post<RegistroComidaResponse>(`${this.ruta(id)}/confirmar`, req);
  }

  /** POST /analisis/{id}/descartar (204). Solo COMPLETADO o FALLIDO. */
  descartar(id: string): Observable<void> {
    return this.http.post<void>(`${this.ruta(id)}/descartar`, null);
  }

  private ruta(id: string): string {
    return `${this.url}/${encodeURIComponent(id)}`;
  }
}
