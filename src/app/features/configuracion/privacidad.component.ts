import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { CuentaService } from '@core/services/cuenta.service';
import { aApiError } from '@core/util/api-error';
import { descargarBlob } from '@core/util/descarga';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsCheckboxComponent } from '@shared/ui/form/checkbox.component';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { ReenviarVerificacionComponent } from '../auth/componentes/reenviar-verificacion.component';
import { TextoDatosSaludComponent } from '../auth/componentes/texto-datos-salud.component';

/** Lo que incluye GET /cuenta/exportacion (RGPD art. 20). */
const CONTENIDO_EXPORTACION = [
  'Tu cuenta y tus consentimientos',
  'Tu perfil, preferencias y objetivos',
  'Tus comidas, entrenamientos y pesajes',
  'Tus menús, listas de la compra y recetas favoritas',
  'Tus conversaciones con el asistente',
  'Tus análisis de fotos (sin las imágenes) e insights',
];

/**
 * Configuración › Privacidad y datos (DESIGN.md §7.16, NutriSport_API.md §4):
 * - Consentimiento de datos de salud: estado, qué se trata y qué va al proveedor de IA, revocar
 *   (con confirmación) o volver a darlo.
 * - Exportar mis datos (§7.6): qué incluye, descarga del JSON y, sin el email verificado, el aviso
 *   con "Reenviar". No depende del consentimiento: se puede exportar aunque esté revocado.
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
    ReenviarVerificacionComponent,
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
      </div>
      <p class="ns-bloque__texto">
        Descarga un archivo JSON con todos tus datos de NutriSport. Puedes hacerlo aunque hayas revocado el
        consentimiento. Incluye:
      </p>
      <ul class="ns-bloque__vinetas">
        @for (elemento of contenidoExportacion; track elemento) {
          <li>{{ elemento }}</li>
        }
      </ul>
      <p class="ns-bloque__nota">Nunca incluye tu contraseña ni tus tokens de sesión.</p>

      @if (!emailVerificado()) {
        <ns-alert type="info" titulo="Verifica tu email">
          Para exportar tus datos tienes que verificar tu email. Abre el enlace que te enviamos o pide uno nuevo.
        </ns-alert>
        <app-reenviar-verificacion [email]="email()" textoBoton="Reenviar" />
      } @else if (errorExportar(); as error) {
        <ns-alert type="error">{{ error }}</ns-alert>
      }

      <div class="ns-bloque__acciones">
        <button
          nsButton
          type="button"
          variant="secondary"
          icon="download"
          [loading]="exportando()"
          [disabled]="!emailVerificado()"
          (click)="exportar()"
        >
          Exportar mis datos
        </button>
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

  protected readonly contenidoExportacion = CONTENIDO_EXPORTACION;
  protected readonly emailVerificado = this.auth.emailVerificado;
  protected readonly email = computed(() => this.auth.cuenta()?.email ?? null);
  protected readonly exportando = signal(false);
  protected readonly errorExportar = signal<string | null>(null);

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

  protected async exportar(): Promise<void> {
    if (this.exportando() || !this.emailVerificado()) return;
    this.exportando.set(true);
    this.errorExportar.set(null);
    try {
      const { blob, nombre } = await firstValueFrom(this.cuentas.exportar());
      descargarBlob(blob, nombre);
      this.toasts.exito('Datos exportados', `Se ha descargado ${nombre}.`);
    } catch (e) {
      const error = aApiError(e);
      const cuenta = this.auth.cuenta();
      if (error.esCodigo('EMAIL_NO_VERIFICADO') && cuenta) {
        // La cuenta en memoria estaba desfasada: se muestra el aviso con "Reenviar".
        this.auth.actualizarCuenta({ ...cuenta, emailVerificado: false });
      } else {
        this.errorExportar.set(error.detalle);
      }
    } finally {
      this.exportando.set(false);
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
