import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { aApiError } from '@core/util/api-error';
import { aplicarErroresServidor } from '@core/util/formularios';
import { leerTokenDelFragmento } from '@core/util/token-fragmento';
import { coincideCon, contrasenaSegura } from '@core/util/validadores';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { CampoPasswordComponent } from '../componentes/campo-password.component';
import { PasswordStrengthComponent } from '../componentes/password-strength.component';

/**
 * Enlace del email de recuperación (NutriSport_API.md §2.2, DESIGN.md §7.18):
 * `/restablecer-password#token=…`. Sin guard: vale con o sin sesión.
 *
 * Nueva contraseña + confirmar (mismas reglas y medidor que el registro) → POST
 * /auth/restablecer-password. El backend cierra todas las sesiones: AuthService.restablecerPassword()
 * cierra también la local, y se va a /login con un toast. TOKEN_NO_VALIDO → enlace caducado.
 */
@Component({
  selector: 'app-restablecer-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NsButtonComponent,
    NsAlertComponent,
    NsEmptyStateComponent,
    NsFormFieldComponent,
    CampoPasswordComponent,
    PasswordStrengthComponent,
  ],
  template: `
    @if (!token) {
      <ns-empty-state
        icon="triangle-exclamation-point"
        titulo="El enlace está incompleto"
        descripcion="Abre el enlace directamente desde el email o cópialo entero. Si no funciona, pide uno nuevo."
        [nivelTitulo]="1"
      >
        <a nsButton routerLink="/recuperar-password">Pedir un enlace nuevo</a>
      </ns-empty-state>
    } @else if (tokenNoValido()) {
      <ns-empty-state
        icon="triangle-exclamation-point"
        titulo="El enlace ha caducado o ya se ha usado"
        descripcion="Los enlaces para cambiar la contraseña caducan a los 30 minutos y solo sirven una vez."
        [nivelTitulo]="1"
      >
        <a nsButton routerLink="/recuperar-password">Pedir un enlace nuevo</a>
      </ns-empty-state>
    } @else {
      <header class="ns-auth-form__cabecera">
        <h1 class="ns-auth-form__titulo ns-text-h1">Crea una contraseña nueva</h1>
        <p class="ns-auth-form__subtitulo">Al guardarla se cerrarán todas tus sesiones abiertas.</p>
      </header>

      <form class="ns-auth-form__campos" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        @if (error(); as error) {
          <ns-alert type="error">{{ error }}</ns-alert>
        }

        <ns-form-field
          label="Nueva contraseña"
          hint="De 10 a 72 caracteres, con al menos una letra y un número."
          obligatorio
        >
          <ns-campo-password formControlName="nuevaPassword" autocomplete="new-password" />
        </ns-form-field>
        <ns-password-strength [password]="password()" />

        <ns-form-field label="Confirmar contraseña" obligatorio>
          <ns-campo-password formControlName="confirmarPassword" autocomplete="new-password" />
        </ns-form-field>

        <button nsButton type="submit" size="lg" fullWidth [loading]="enviando()">Guardar contraseña</button>
      </form>
    }
  `,
  styleUrl: '../auth-formulario.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestablecerPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toasts = inject(NsToastService);

  protected readonly token = leerTokenDelFragmento(inject(ActivatedRoute));

  private readonly passwordControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, contrasenaSegura()],
  });

  protected readonly form = new FormGroup({
    // Mismo nombre que en RestablecerPasswordRequest, para que los errores 400 caigan en su campo.
    nuevaPassword: this.passwordControl,
    confirmarPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, coincideCon(this.passwordControl)],
    }),
  });

  protected readonly password = toSignal(this.passwordControl.valueChanges, { initialValue: '' });
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly tokenNoValido = signal(false);

  constructor() {
    this.passwordControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const confirmar = this.form.controls.confirmarPassword;
      if (confirmar.value) confirmar.updateValueAndValidity();
    });
  }

  protected async guardar(): Promise<void> {
    if (!this.token || this.enviando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    try {
      // restablecerPassword() ya hace AuthService.cerrarSesionLocal() al responder 204.
      await firstValueFrom(this.auth.restablecerPassword(this.token, this.passwordControl.value));
      this.toasts.exito('Contraseña cambiada', 'Inicia sesión con la nueva.');
      await this.router.navigateByUrl('/login');
    } catch (e) {
      const error = aApiError(e);
      if (error.esCodigo('TOKEN_NO_VALIDO')) this.tokenNoValido.set(true);
      else if (error.status === 400 && aplicarErroresServidor(this.form, error)) return;
      else this.error.set(error.detalle);
    } finally {
      this.enviando.set(false);
    }
  }
}
