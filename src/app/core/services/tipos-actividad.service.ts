import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';

import { environment } from '@env/environment';
import type { TipoActividadResponse } from '../models';

/**
 * Catálogo de tipos de actividad con su MET (GET /entrenamientos/tipos), ordenado por categoría y
 * nombre. Su `codigo` se usa en EntrenamientoRequest.tipoActividadCodigo y en
 * PerfilRequest.deportePrincipal.
 *
 * Es un catálogo estático: se pide una vez y se comparte (shareReplay). Si la petición falla, no
 * se guarda el error: la siguiente llamada lo vuelve a intentar.
 */
@Injectable({ providedIn: 'root' })
export class TiposActividadService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/entrenamientos/tipos`;

  private tipos$: Observable<TipoActividadResponse[]> | null = null;

  listar(): Observable<TipoActividadResponse[]> {
    this.tipos$ ??= this.http.get<TipoActividadResponse[]>(this.url).pipe(
      catchError((error: unknown) => {
        this.tipos$ = null;
        return throwError(() => error);
      }),
      shareReplay(1),
    );
    return this.tipos$;
  }
}
