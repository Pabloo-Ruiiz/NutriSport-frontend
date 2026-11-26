import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { CuentaService } from '@core/services/cuenta.service';
import { aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsCheckboxComponent } from '@shared/ui/form/checkbox.component';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { TextoDatosSaludComponent } from '../auth/componentes/texto-datos-salud.component';

/**
 * Configuración › Privacidad y datos (DESIGN.md §7.16, NutriSport_API.md §4):
 * - Consentimiento de datos de salud: estado, qué se trata y qué va al proveedor de IA, revocar
 *   (con confirmación) o volver a darlo.
 * - Exportar mis datos: hueco para la Ampliación (paso 36).
 * - Zona de peligro: eliminar la cuenta (contraseña y, opcionalmente, borrado inmediato).
 */
@Component({
  selector: 'app-privacidad',
  imports: [
    ReactiveFormsModule,
    NsAlertComponent,
    NsBadgeComponent,
    NsButtonComponent,
    NsCheckboxComponent,
    TextoDatosSaludComponent,
  ],
  template: `
    <h2 class="ns-text-h3 ns-seccion__titulo">Privacidad y datos</h2>

    <section class="ns-bloque" aria-labelledby="ns-consentimiento-titulo">
      <div class="ns-bloque__cabecera">
        <h3 class="ns-text-h4" id="ns-consentimiento-titulo">Consentimiento de datos de salud</h3>
        @if (vigente()) {
          <ns-badge variant="success" icon="circle-check">Vigente</ns-badge>
        } @else {
          <ns-badge variant="warning" icon="triangle-exclamation-point">Revocado</ns-badge>
        }
      </div>

      @if (!vigente()) {
        <ns-alert type="warning">
          Tu perfil, tus comidas, los análisis de fotos, tus entrenamientos y el seguimiento están bloqueados. Tus datos
          siguen guardados.
        </ns-alert>
      }

      <app-texto-datos-salud [nivelTitulos]="4" sinRevocar />

      <div class="ns-bloque__acciones">
        @if (vigente()) {
          <button nsButton type="button" variant="secondary" [loading]="cambiandoConsentimiento()" (click)="revocar()">
            Revocar consentimiento
          </button>
        } @else {
          <button
            nsButton
            type="button"
            icon="shield-check"
            [loading]="cambiandoConsentimiento()"
            (click)="darConsentimiento()"
          >
            Volver a dar el consentimiento
          </button>
        }
      </div>
    </section>

    <section class="ns-bloque" aria-labelledby="ns-exportar-titulo">
      <div class="ns-bloque__cabecera">
        <h3 class="ns-text-h4" id="ns-exportar-titulo">Exportar mis datos</h3>
        <ns-badge>Próximamente</ns-badge>
      </div>
      <p class="ns-bloque__texto">
        Podrás descargar un archivo con tu cuenta, tu perfil, tus comidas, entrenamientos y pesajes.
      </p>
      <!-- Paso 36: GET /cuenta/exportacion (NutriSport_API.md §7.6). -->
      <div class="ns-bloque__acciones">
        <button nsButton type="button" variant="secondary" disabled>Exportar mis datos</button>
      </div>
    </section>

    <section class="ns-bloque ns-bloque--peligro" aria-labelledby="ns-peligro-titulo">
      <div class="ns-bloque__cabecera">
        <h3 class="ns-text-h4 ns-bloque__peligro" id="ns-peligro-titulo">Zona de peligro</h3>
      </div>
      <p class="ns-bloque__texto">
        Eliminar tu cuenta borra tu perfil, tus comidas, tus fotos, tus entrenamientos y tu historial. Se cerrarán todas
        tus sesiones.
      </p>
      @if (errorEliminar(); as error) {
        <ns-alert type="error">{{ error }}</ns-alert>
      }
      <ns-checkbox [formControl]="inmediata">Borrar todo inmediatamente (si no, se borra a los 30 días)</ns-checkbox>
      <div class="ns-bloque__acciones">
        <button nsButton type="button" variant="danger" icon="trash" [loading]="eliminando()" (click)="eliminar()">
          Eliminar mi cuenta
        </button>
      </div>
    </section>
  `,
  styleUrl: './secciones.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacidadComponent {
  private readonly auth = inject(AuthService);
  private readonly cuentas = inject(CuentaService);
  private readonly confirmacion = inject(NsConfirmService);
  private readonly toasts = inject(NsToastService);
  private readonly router = inject(Router);

  protected readonly vigente = computed(() => this.auth.consentimientoVigente());
  protected readonly cambiandoConsentimiento = signal(false);

  protected readonly inmediata = new FormControl(false, { nonNullable: true });
  protected readonly eliminando = signal(false);
  protected readonly errorEliminar = signal<string | null>(null);

  protected async revocar(): Promise<void> {
    const confirmado = await this.confirmacion.confirmar({
      titulo: '¿Revocar el consentimiento?',
      mensaje:
        'Se bloquearán tu perfil, tus comidas, los análisis de fotos, tus entrenamientos y el seguimiento hasta que ' +
        'vuelvas a darlo. Tus datos no se borran.',
      textoConfirmar: 'Revocar consentimiento',
      peligro: true,
    });
    if (!confirmado) return;
    await this.cambiarConsentimiento(
      () => this.cuentas.revocarConsentimiento(),
      'Consentimiento revocado',
      'Tus datos de salud quedan bloqueados.',
    );
  }

  protected async darConsentimiento(): Promise<void> {
    await this.cambiarConsentimiento(
      () => this.cuentas.darConsentimiento(),
      'Consentimiento restaurado',
      'Ya puedes volver a usar todas las funciones.',
    );
  }

  private async cambiarConsentimiento(
    peticion: () => ReturnType<CuentaService['darConsentimiento']>,
    titulo: string,
    mensaje: string,
  ): Promise<void> {
    this.cambiandoConsentimiento.set(true);
    try {
      await firstValueFrom(peticion());
      this.toasts.exito(titulo, mensaje);
    } catch (e) {
      this.toasts.error('No hemos podido cambiar el consentimiento', aApiError(e).detalle);
    } finally {
      this.cambiandoConsentimiento.set(false);
    }
  }

  protected async eliminar(): Promise<void> {
    if (this.eliminando()) return;
    const inmediata = this.inmediata.value;
    this.errorEliminar.set(null);
    const password = await this.confirmacion.confirmar({
      titulo: '¿Eliminar tu cuenta?',
      mensaje: inmediata
        ? 'Se borrarán ahora mismo tu perfil, tus comidas, tus fotos, tus entrenamientos y tu historial. No se puede deshacer.'
        : 'Tu cuenta quedará desactivada y se borrará del todo dentro de 30 días, con tu perfil, tus comidas, tus fotos y tu historial.',
      textoConfirmar: 'Eliminar mi cuenta',
      peligro: true,
      pedirPassword: true,
    });
    if (!password) return;

    this.eliminando.set(true);
    try {
      // CuentaService.eliminar() envía { password, inmediata } y cierra la sesión local.
      await firstValueFrom(this.cuentas.eliminar({ password, inmediata }));
      this.auth.cerrarSesionLocal();
      this.toasts.exito(
        'Cuenta eliminada',
        inmediata ? 'Hemos borrado todos tus datos.' : 'Se borrará del todo dentro de 30 días.',
      );
      await this.router.navigateByUrl('/login');
    } catch (e) {
      const error = aApiError(e);
      // La contraseña incorrecta llega como 400 en el campo password (§11.4); el diálogo ya se ha cerrado.
      this.errorEliminar.set(error.erroresDe('password')[0]?.mensaje ?? error.detalle);
    } finally {
      this.eliminando.set(false);
    }
  }
}
