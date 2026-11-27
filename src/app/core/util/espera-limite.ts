import { DestroyRef, computed, inject, signal } from '@angular/core';

import { textoEspera } from './api-error';

/**
 * Espera tras un 429 LIMITE_EXCEDIDO (NutriSport_API.md §2.3): cuenta atrás desde Retry-After con
 * el texto "Inténtalo de nuevo en 12 minutos." y `activa` para desactivar el botón mientras dura.
 * Se crea en un contexto de inyección (campo de un componente).
 *
 *   protected readonly espera = new EsperaLimite();
 *   …
 *   if (error.status === 429) this.espera.iniciar(error.retryAfterSegundos);
 *
 *   @if (espera.mensaje(); as mensaje) { <ns-alert type="warning">{{ mensaje }}</ns-alert> }
 *   <button nsButton [disabled]="espera.activa()">…</button>
 *
 * Sin Retry-After no hay cuenta atrás: muestra "Inténtalo de nuevo más tarde." y no bloquea.
 */
export class EsperaLimite {
  /** Momento (ms) en que termina la espera. */
  private readonly hasta = signal<number | null>(null);
  private readonly ahora = signal(Date.now());
  private readonly sinTiempo = signal(false);
  private intervalo: ReturnType<typeof setInterval> | null = null;

  /** true mientras no se puede volver a intentar. */
  readonly activa = computed(() => {
    const hasta = this.hasta();
    return hasta !== null && this.ahora() < hasta;
  });

  /** Texto de espera, o null si no hay límite que mostrar. */
  readonly mensaje = computed(() => {
    if (this.activa()) return textoEspera(Math.ceil((this.hasta()! - this.ahora()) / 1000));
    return this.sinTiempo() ? textoEspera(null) : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.parar());
  }

  iniciar(segundos: number | null): void {
    this.parar();
    if (segundos === null || segundos <= 0) {
      this.hasta.set(null);
      this.sinTiempo.set(segundos === null);
      return;
    }
    this.sinTiempo.set(false);
    // Un único Date.now(): con dos lecturas, 1 ms entre ellas daba 1801 s y "31 minutos" en vez de 30.
    const inicio = Date.now();
    this.ahora.set(inicio);
    this.hasta.set(inicio + segundos * 1000);
    this.intervalo = setInterval(() => {
      this.ahora.set(Date.now());
      if (!this.activa()) this.limpiar();
    }, 1000);
  }

  /** Quita el aviso (p. ej. al volver a intentarlo con éxito). */
  limpiar(): void {
    this.parar();
    this.hasta.set(null);
    this.sinTiempo.set(false);
  }

  private parar(): void {
    if (this.intervalo !== null) clearInterval(this.intervalo);
    this.intervalo = null;
  }
}
