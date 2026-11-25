import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '@env/environment';
import type { PerfilResponse } from '../models';
import { estadoHttp } from '../util/api-error';

/**
 * Perfil deportivo (NutriSport_API.md §4 y §6 Perfil).
 *
 * Por ahora solo sabe si el perfil existe, que es lo que necesita perfilGuard: muchos endpoints
 * responden 422 PERFIL_REQUERIDO sin él. El resultado se cachea en un signal para no repetir
 * GET /perfil en cada navegación; se borra al cerrar la sesión (AuthService llama a limpiar()).
 */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/perfil`;

  /** null = aún no se sabe. */
  private readonly existeCache = signal<boolean | null>(null);
  /** Comprobación en curso, compartida entre quienes llamen a existe() a la vez. */
  private comprobacion: Promise<boolean> | null = null;
  /** Sube en limpiar(): una respuesta que llega después no debe rellenar la caché. */
  private generacion = 0;

  /** true/false si ya se sabe si el perfil existe; null si no se ha comprobado. */
  readonly perfilExiste = this.existeCache.asReadonly();

  /**
   * ¿Tiene el usuario perfil deportivo? GET /perfil: 200 → true, 404 → false. Cualquier otro
   * error (403 CONSENTIMIENTO_REVOCADO, sin conexión…) se propaga y no se cachea.
   */
  existe(): Promise<boolean> {
    const cacheado = this.existeCache();
    if (cacheado !== null) return Promise.resolve(cacheado);
    if (this.comprobacion) return this.comprobacion;

    const generacion = this.generacion;
    const comprobacion = firstValueFrom(this.http.get<PerfilResponse>(this.url))
      .then(
        () => true,
        (error: unknown) => {
          if (estadoHttp(error) === 404) return false;
          throw error;
        },
      )
      .then((existe) => {
        if (generacion === this.generacion) this.existeCache.set(existe);
        return existe;
      })
      .finally(() => {
        if (this.comprobacion === comprobacion) this.comprobacion = null;
      });
    this.comprobacion = comprobacion;
    return comprobacion;
  }

  /** Tras crear el perfil (PUT /perfil en la bienvenida): el guard ya deja pasar sin preguntar. */
  marcarCreado(): void {
    this.generacion++;
    this.comprobacion = null;
    this.existeCache.set(true);
  }

  /** Olvida lo que se sabía del perfil. Se llama al cerrar la sesión. */
  limpiar(): void {
    this.generacion++;
    this.comprobacion = null;
    this.existeCache.set(null);
  }
}
