import { ChangeDetectionStrategy, Component, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { AuthService } from '../services/auth.service';
import { aApiError } from '../util/api-error';
import { EsperaLimite } from '../util/espera-limite';

/**
 * Avisos cerrados en esta sesión. Solo en memoria (un signal): al recargar vuelven a salir. Se
 * guarda el id de la cuenta, así que si entra otro usuario el aviso vuelve a mostrarse.
 * Vive en la raíz para que el aviso siga cerrado al pasar del shell al layout de administración.
 */
@Injectable({ providedIn: 'root' })
export class AvisosCerradosService {
  readonly emailSinVerificar = signal<string | null>(null);
}

/**
 * Avisos de la cuenta bajo la topbar del shell (NutriSport_API.md §4, DESIGN.md §5.11):
 * - Email sin verificar: el análisis de fotos y el asistente responden 403 EMAIL_NO_VERIFICADO.
 *   "Reenviar correo" llama a POST /auth/reenviar-verificacion con el email de la cuenta (toast y
 *   429). Se puede cerrar durante la sesión.
 *
 * Paso 13: aquí irá también el aviso de consentimiento de salud revocado.
 */
@Component({
  selector: 'ns-aviso-cuenta',
  imports: [NsAlertComponent, NsButtonComponent],
  template: `
    @if (mostrarEmail()) {
      <ns-alert
        class="ns-aviso-cuenta__alerta"
        type="info"
        dismissible
        etiquetaCerrar="Ocultar el aviso de verificación"
        (cerrar)="cerrarEmail()"
      >
        Verifica tu email para usar el análisis de fotos y el asistente.
        @if (espera.mensaje(); as mensaje) {
          <span class="ns-aviso-cuenta__espera">{{ mensaje }}</span>
        }
        <button
          nsAlertAcciones
          nsButton
          type="button"
          variant="secondary"
          size="sm"
          icon="mail-check"
          [loading]="enviando()"
          [disabled]="espera.activa()"
          (click)="reenviar()"
        >
          Reenviar correo
        </button>
      </ns-alert>
    }
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: var(--ns-space-6);
    }
    /* Sin avisos (solo quedan los comentarios de @if): no ocupa sitio. */
    :host:empty {
      display: none;
    }
    .ns-aviso-cuenta__espera {
      display: block;
      margin-top: 2px;
      color: var(--ns-warning);
      font-weight: 500;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvisoCuentaComponent {
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(NsToastService);
  private readonly cerrados = inject(AvisosCerradosService);

  protected readonly mostrarEmail = computed(() => {
    const cuenta = this.auth.cuenta();
    return !!cuenta && !this.auth.emailVerificado() && this.cerrados.emailSinVerificar() !== cuenta.id;
  });

  protected readonly enviando = signal(false);
  protected readonly espera = new EsperaLimite();

  protected cerrarEmail(): void {
    this.cerrados.emailSinVerificar.set(this.auth.cuenta()?.id ?? null);
  }

  protected async reenviar(): Promise<void> {
    const email = this.auth.cuenta()?.email;
    if (!email || this.enviando() || this.espera.activa()) return;

    this.enviando.set(true);
    this.espera.limpiar();
    try {
      await firstValueFrom(this.auth.reenviarVerificacion(email));
      this.toasts.exito('Correo reenviado', `Revisa la bandeja de ${email}. El enlace caduca en 24 horas.`);
    } catch (e) {
      const error = aApiError(e);
      if (error.status === 429) this.espera.iniciar(error.retryAfterSegundos);
      else this.toasts.error('No hemos podido reenviar el correo', error.detalle);
    } finally {
      this.enviando.set(false);
    }
  }
}
