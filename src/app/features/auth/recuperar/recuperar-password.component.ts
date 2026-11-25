import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { aApiError } from '@core/util/api-error';
import { EsperaLimite } from '@core/util/espera-limite';
import { aplicarErroresServidor } from '@core/util/formularios';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';

/** El backend responde siempre igual (NutriSport_API.md §2.4): la interfaz también. */
export const MENSAJE_RECUPERACION =
  'Si existe una cuenta con ese email, te hemos enviado un enlace. Caduca en 30 minutos.';

/**
 * Recuperar la contraseña (DESIGN.md §7.18): email → POST /auth/recuperar-password → siempre el
 * mismo mensaje, exista o no la cuenta. 429 (3 por hora) → tiempo de espera.
 */
@Component({
  selector: 'app-recuperar-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NsButtonComponent,
    NsAlertComponent,
    NsFormFieldComponent,
    NsInputDirective,
  ],
  template: `
    <header class="ns-auth-form__cabecera">
      <h1 class="ns-auth-form__titulo ns-text-h1">¿Olvidaste tu contraseña?</h1>
      <p class="ns-auth-form__subtitulo">Escribe tu email y te enviaremos un enlace para crear una nueva.</p>
    </header>

    <form class="ns-auth-form__campos" [formGroup]="form" (ngSubmit)="enviar()" novalidate>
      @if (espera.mensaje(); as mensaje) {
        <ns-alert type="warning" titulo="Demasiadas solicitudes">{{ mensaje }}</ns-alert>
      } @else if (error(); as error) {
        <ns-alert type="error">{{ error }}</ns-alert>
      } @else if (enviado()) {
        <ns-alert type="success" titulo="Revisa tu email">{{ mensajeEnviado }}</ns-alert>
      }

      <ns-form-field label="Email" obligatorio>
        <input nsInput type="email" formControlName="email" autocomplete="email" inputmode="email" />
      </ns-form-field>

      <button nsButton type="submit" size="lg" fullWidth [loading]="enviando()" [disabled]="espera.activa()">
        {{ enviado() ? 'Enviar de nuevo' : 'Enviar enlace' }}
      </button>
    </form>

    <p class="ns-auth-form__pie">
      <a class="ns-auth-form__enlace" routerLink="/login">Volver a iniciar sesión</a>
    </p>
  `,
  styleUrl: '../auth-formulario.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecuperarPasswordComponent {
  private readonly auth = inject(AuthService);

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  protected readonly mensajeEnviado = MENSAJE_RECUPERACION;
  protected readonly enviado = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly espera = new EsperaLimite();

  protected async enviar(): Promise<void> {
    if (this.enviando() || this.espera.activa()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    this.enviado.set(false);
    this.espera.limpiar();
    try {
      await firstValueFrom(this.auth.recuperarPassword(this.form.controls.email.value.trim()));
      this.enviado.set(true);
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
