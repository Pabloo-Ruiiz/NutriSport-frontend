import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { rutaDeInicio } from '@core/guards/invitado.guard';
import { AuthService } from '@core/services/auth.service';
import { aApiError } from '@core/util/api-error';
import { EsperaLimite } from '@core/util/espera-limite';
import { aplicarErroresServidor } from '@core/util/formularios';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsCheckboxComponent } from '@shared/ui/form/checkbox.component';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { CampoPasswordComponent } from '../componentes/campo-password.component';

/**
 * `volver` solo se usa si es una ruta interna: empieza por "/" pero no por "//" ni "/\", que el
 * navegador trataría como otra web (redirección abierta).
 */
export function destinoInterno(volver: string | null | undefined): string | null {
  if (!volver || !volver.startsWith('/') || volver.startsWith('//') || volver.startsWith('/\\')) return null;
  return volver;
}

/**
 * Login (DESIGN.md §7.1, NutriSport_API.md §2): email, contraseña y "Mantener la sesión iniciada".
 *
 * - 401: el mismo mensaje para credenciales incorrectas y cuentas bloqueadas (§2.4), en un ns-alert.
 * - 429: tras 5 intentos fallidos, aviso con el tiempo de espera y botón desactivado (§2.3).
 * - 400: errores en los campos.
 * - Bien: a `volver` (si es una ruta interna) o a la página de inicio según el rol.
 */
@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NsButtonComponent,
    NsAlertComponent,
    NsCheckboxComponent,
    NsFormFieldComponent,
    NsInputDirective,
    CampoPasswordComponent,
  ],
  template: `
    <header class="ns-auth-form__cabecera">
      <h1 class="ns-auth-form__titulo ns-text-h1">Bienvenido de nuevo</h1>
      <p class="ns-auth-form__subtitulo">Entra para seguir con tu plan de nutrición.</p>
    </header>

    <form class="ns-auth-form__campos" [formGroup]="form" (ngSubmit)="entrar()" novalidate>
      @if (espera.mensaje(); as mensaje) {
        <ns-alert type="warning" titulo="Demasiados intentos">{{ mensaje }}</ns-alert>
      } @else if (error(); as error) {
        <ns-alert type="error">{{ error }}</ns-alert>
      }

      <ns-form-field label="Email" obligatorio>
        <input nsInput type="email" formControlName="email" autocomplete="username" inputmode="email" />
      </ns-form-field>

      <ns-form-field label="Contraseña" obligatorio>
        <ns-campo-password formControlName="password" autocomplete="current-password" />
      </ns-form-field>

      <p class="ns-auth-form__fila">
        <a class="ns-auth-form__enlace" routerLink="/recuperar-password">¿Olvidaste tu contraseña?</a>
      </p>

      <ns-checkbox formControlName="mantenerSesion">
        Mantener la sesión iniciada
        <span class="ns-auth-form__detalle">Si no la marcas, la sesión termina al cerrar el navegador.</span>
      </ns-checkbox>

      <button nsButton type="submit" size="lg" fullWidth [loading]="enviando()" [disabled]="espera.activa()">
        Iniciar sesión
      </button>
    </form>

    <p class="ns-auth-form__pie">
      ¿Aún no tienes cuenta? <a class="ns-auth-form__enlace" routerLink="/registro">Crear cuenta</a>
    </p>
  `,
  styleUrl: '../auth-formulario.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  /** Query param ?volver=… que pone autenticadoGuard (withComponentInputBinding). */
  readonly volver = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
    mantenerSesion: new FormControl(false, { nonNullable: true }),
  });

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly espera = new EsperaLimite();

  protected async entrar(): Promise<void> {
    if (this.enviando() || this.espera.activa()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    this.espera.limpiar();
    const { email, password, mantenerSesion } = this.form.getRawValue();
    try {
      const respuesta = await firstValueFrom(this.auth.login({ email: email.trim(), password, mantenerSesion }));
      await this.router.navigateByUrl(destinoInterno(this.volver()) ?? rutaDeInicio(respuesta.cuenta.roles));
    } catch (e) {
      const error = aApiError(e);
      if (error.status === 429) this.espera.iniciar(error.retryAfterSegundos);
      else if (error.status === 400 && aplicarErroresServidor(this.form, error)) return;
      else this.error.set(error.detalle);
    } finally {
      this.enviando.set(false);
    }
  }
}
