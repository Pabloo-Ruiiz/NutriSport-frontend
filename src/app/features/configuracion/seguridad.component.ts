import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { CuentaService } from '@core/services/cuenta.service';
import { aApiError } from '@core/util/api-error';
import { aplicarErroresServidor } from '@core/util/formularios';
import { coincideCon, contrasenaSegura } from '@core/util/validadores';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { CampoPasswordComponent } from '../auth/componentes/campo-password.component';
import { PasswordStrengthComponent } from '../auth/componentes/password-strength.component';

/**
 * Configuración › Seguridad (DESIGN.md §7.16):
 * - Cambiar contraseña → PUT /cuenta/password. El backend cierra todas las sesiones: sesión local
 *   cerrada, toast y /login.
 * - Cambiar email → PUT /cuenta/email: el mensaje genérico de la respuesta (§2.4).
 * - Cerrar sesión en todos los dispositivos → AuthService.logoutTodas() (lleva a /login).
 * La contraseña incorrecta llega como 400 VALIDACION en passwordActual o password (§11.4).
 */
@Component({
  selector: 'app-seguridad',
  imports: [
    ReactiveFormsModule,
    NsAlertComponent,
    NsButtonComponent,
    NsFormFieldComponent,
    NsInputDirective,
    CampoPasswordComponent,
    PasswordStrengthComponent,
  ],
  template: `
    <h2 class="ns-text-h3 ns-seccion__titulo">Seguridad</h2>

    <form class="ns-bloque" [formGroup]="formPassword" (ngSubmit)="cambiarPassword()" novalidate>
      <div class="ns-bloque__cabecera"><h3 class="ns-text-h4">Cambiar contraseña</h3></div>
      <p class="ns-bloque__texto">Al cambiarla se cerrarán todas tus sesiones y tendrás que volver a entrar.</p>
      @if (errorPassword(); as error) {
        <ns-alert type="error">{{ error }}</ns-alert>
      }
      <div class="ns-bloque__campos">
        <ns-form-field label="Contraseña actual" obligatorio>
          <ns-campo-password formControlName="passwordActual" autocomplete="current-password" />
        </ns-form-field>
        <ns-form-field
          label="Nueva contraseña"
          hint="De 10 a 72 caracteres, con al menos una letra y un número."
          obligatorio
        >
          <ns-campo-password formControlName="nuevaPassword" autocomplete="new-password" />
        </ns-form-field>
        <ns-password-strength [password]="nuevaPassword()" />
        <ns-form-field label="Confirmar nueva contraseña" obligatorio>
          <ns-campo-password formControlName="confirmarPassword" autocomplete="new-password" />
        </ns-form-field>
      </div>
      <div class="ns-bloque__acciones">
        <button nsButton type="submit" [loading]="enviandoPassword()">Cambiar contraseña</button>
      </div>
    </form>

    <form class="ns-bloque" [formGroup]="formEmail" (ngSubmit)="cambiarEmail()" novalidate>
      <div class="ns-bloque__cabecera"><h3 class="ns-text-h4">Cambiar email</h3></div>
      <p class="ns-bloque__texto">
        Ahora usas <strong>{{ emailActual() }}</strong>. Te enviaremos un enlace al email nuevo y el cambio se hará al
        abrirlo.
      </p>
      @if (mensajeEmail(); as mensaje) {
        <ns-alert type="success" titulo="Revisa tu email">{{ mensaje }}</ns-alert>
      } @else if (errorEmail(); as error) {
        <ns-alert type="error">{{ error }}</ns-alert>
      }
      <div class="ns-bloque__campos">
        <ns-form-field label="Email nuevo" obligatorio>
          <input
            nsInput
            type="email"
            formControlName="nuevoEmail"
            autocomplete="email"
            inputmode="email"
            maxlength="254"
          />
        </ns-form-field>
        <ns-form-field label="Contraseña" hint="Para confirmar que eres tú." obligatorio>
          <ns-campo-password formControlName="password" autocomplete="current-password" />
        </ns-form-field>
      </div>
      <div class="ns-bloque__acciones">
        <button nsButton type="submit" variant="secondary" [loading]="enviandoEmail()">Enviar enlace</button>
      </div>
    </form>

    <section class="ns-bloque" aria-labelledby="ns-sesiones-titulo">
      <div class="ns-bloque__cabecera"><h3 class="ns-text-h4" id="ns-sesiones-titulo">Sesiones abiertas</h3></div>
      <p class="ns-bloque__texto">
        Cierra la sesión en todos los dispositivos donde hayas entrado, también en este. Útil si has usado un ordenador
        compartido o has perdido el móvil.
      </p>
      <div class="ns-bloque__acciones">
        <button
          nsButton
          type="button"
          variant="secondary"
          icon="log-out"
          [loading]="cerrandoSesiones()"
          (click)="cerrarTodas()"
        >
          Cerrar sesión en todos los dispositivos
        </button>
      </div>
    </section>
  `,
  styleUrl: './secciones.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeguridadComponent {
  private readonly auth = inject(AuthService);
  private readonly cuentas = inject(CuentaService);
  private readonly toasts = inject(NsToastService);
  private readonly confirmacion = inject(NsConfirmService);
  private readonly router = inject(Router);

  protected readonly emailActual = () => this.auth.cuenta()?.email ?? '';

  // ---- Contraseña
  private readonly nuevaPasswordControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, contrasenaSegura()],
  });
  protected readonly formPassword = new FormGroup({
    passwordActual: new FormControl('', { nonNullable: true, validators: Validators.required }),
    nuevaPassword: this.nuevaPasswordControl,
    confirmarPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, coincideCon(this.nuevaPasswordControl)],
    }),
  });
  protected readonly nuevaPassword = toSignal(this.nuevaPasswordControl.valueChanges, { initialValue: '' });
  protected readonly enviandoPassword = signal(false);
  protected readonly errorPassword = signal<string | null>(null);

  // ---- Email
  protected readonly formEmail = new FormGroup({
    nuevoEmail: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(254)],
    }),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
  protected readonly enviandoEmail = signal(false);
  protected readonly errorEmail = signal<string | null>(null);
  protected readonly mensajeEmail = signal<string | null>(null);

  protected readonly cerrandoSesiones = signal(false);

  constructor() {
    this.nuevaPasswordControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const confirmar = this.formPassword.controls.confirmarPassword;
      if (confirmar.value) confirmar.updateValueAndValidity();
    });
  }

  protected async cambiarPassword(): Promise<void> {
    if (this.enviandoPassword()) return;
    if (this.formPassword.invalid) {
      this.formPassword.markAllAsTouched();
      return;
    }
    const { passwordActual, nuevaPassword } = this.formPassword.getRawValue();
    this.enviandoPassword.set(true);
    this.errorPassword.set(null);
    try {
      await firstValueFrom(this.cuentas.cambiarPassword({ passwordActual, nuevaPassword }));
      // CuentaService ya cierra la sesión local; se repite por si se llama desde otro sitio.
      this.auth.cerrarSesionLocal();
      this.toasts.exito('Contraseña cambiada', 'Inicia sesión con la nueva.');
      await this.router.navigateByUrl('/login');
    } catch (e) {
      const error = aApiError(e);
      if (error.status === 400 && aplicarErroresServidor(this.formPassword, error)) return;
      this.errorPassword.set(error.detalle);
    } finally {
      this.enviandoPassword.set(false);
    }
  }

  protected async cambiarEmail(): Promise<void> {
    if (this.enviandoEmail()) return;
    this.mensajeEmail.set(null);
    if (this.formEmail.invalid) {
      this.formEmail.markAllAsTouched();
      return;
    }
    const { nuevoEmail, password } = this.formEmail.getRawValue();
    this.enviandoEmail.set(true);
    this.errorEmail.set(null);
    try {
      const respuesta = await firstValueFrom(this.cuentas.cambiarEmail({ nuevoEmail, password }));
      this.mensajeEmail.set(respuesta.mensaje);
      this.formEmail.reset();
    } catch (e) {
      const error = aApiError(e);
      if (error.status === 400 && aplicarErroresServidor(this.formEmail, error)) return;
      this.errorEmail.set(error.detalle);
    } finally {
      this.enviandoEmail.set(false);
    }
  }

  protected async cerrarTodas(): Promise<void> {
    const confirmado = await this.confirmacion.confirmar({
      titulo: '¿Cerrar sesión en todos los dispositivos?',
      mensaje: 'Tendrás que volver a iniciar sesión en cada dispositivo, también en este.',
      textoConfirmar: 'Cerrar todas las sesiones',
    });
    if (!confirmado) return;
    this.cerrandoSesiones.set(true);
    try {
      const confirmadoPorServidor = await this.auth.logoutTodas();
      if (!confirmadoPorServidor) {
        this.toasts.info('Sesión cerrada en este dispositivo', 'No hemos podido confirmar el cierre en los demás.');
      }
    } finally {
      this.cerrandoSesiones.set(false);
    }
  }
}
