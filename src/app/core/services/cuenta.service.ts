import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '@env/environment';
import type { CuentaResponse } from '../models';
import { AuthService } from './auth.service';

/**
 * Cuenta del usuario autenticado (NutriSport_API.md §6 Cuenta). Por ahora solo obtener(); el resto
 * de métodos (datos, contraseña, email, consentimiento, eliminación) llega en el paso 13.
 */
@Injectable({ providedIn: 'root' })
export class CuentaService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = `${environment.apiUrl}/cuenta`;

  /** GET /cuenta. Actualiza la cuenta en memoria de AuthService (emailVerificado, email, roles…). */
  obtener(): Observable<CuentaResponse> {
    return this.http.get<CuentaResponse>(this.url).pipe(tap((cuenta) => this.auth.actualizarCuenta(cuenta)));
  }
}
