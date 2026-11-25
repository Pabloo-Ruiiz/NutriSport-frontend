import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import type { RegistroRequest } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { aApiError } from '@core/util/api-error';
import { EsperaLimite } from '@core/util/espera-limite';
import { aplicarErroresServidor } from '@core/util/formularios';
import { casillaMarcada, coincideCon, contrasenaSegura, noSoloEspacios } from '@core/util/validadores';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsCheckboxComponent } from '@shared/ui/form/checkbox.component';
import { ErrorCampoDirective } from '@shared/ui/form/error-campo.directive';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { CampoPasswordComponent } from '../componentes/campo-password.component';
import { PasswordStrengthComponent } from '../componentes/password-strength.component';
import { DatosSaludDialogComponent } from './datos-salud-dialog.component';

/** Estado de navegación que recibe /registro/revisa-tu-email. */
export interface EstadoRevisaEmail {
  email: string;
}

/**
 * Registro (DESIGN.md §7.2, NutriSport_API.md §8): nombre, email, contraseña con medidor,
 * confirmación y tres casillas separadas (mayoría de edad, términos y consentimiento de salud).
 *
 * El cuerpo lleva siempre los tres booleanos y nunca la confirmación. El backend responde 202 con
 * el mismo mensaje exista o no el email (§2.4), así que siempre se va a "Revisa tu email".
 */
@Component({
  selector: 'app-registro',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NsButtonComponent,
    NsAlertComponent,
    NsCheckboxComponent,
    NsFormFieldComponent,
    NsInputDirective,
    ErrorCampoDirective,
    CampoPasswordComponent,
    PasswordStrengthComponent,
  ],
  template: `
    <header class="ns-auth-form__cabecera">
      <h1 class="ns-auth-form__titulo ns-text-h1">Crea tu cuenta</h1>
      <p class="ns-auth-form__subtitulo">Empieza a registrar tus comidas y a seguir tus objetivos.</p>
    </header>

    <form class="ns-auth-form__campos" [formGroup]="form" (ngSubmit)="registrar()" novalidate>
      @if (espera.mensaje(); as mensaje) {
        <ns-alert type="warning" titulo="Demasiados intentos">{{ mensaje }}</ns-alert>
      } @else if (error(); as error) {
        <ns-alert type="error">{{ error }}</ns-alert>
      }

      <ns-form-field label="Nombre" obligatorio>
        <input nsInput type="text" formControlName="nombre" autocomplete="name" maxlength="80" />
      </ns-form-field>

      <ns-form-field label="Email" obligatorio>
        <input nsInput type="email" formControlName="email" autocomplete="email" inputmode="email" maxlength="254" />
      </ns-form-field>

      <ns-form-field label="Contraseña" hint="De 10 a 72 caracteres, con al menos una letra y un número." obligatorio>
        <ns-campo-password formControlName="password" autocomplete="new-password" />
      </ns-form-field>
      <ns-password-strength [password]="password()" />

      <ns-form-field label="Confirmar contraseña" obligatorio>
        <ns-campo-password formControlName="confirmarPassword" autocomplete="new-password" />
      </ns-form-field>

      <fieldset class="ns-auth-form__casillas">
        <legend class="ns-sr-only">Declaraciones y consentimientos</legend>

        <div class="ns-auth-form__casilla">
          <ns-checkbox #mayor formControlName="mayorDeEdad">Declaro ser mayor de 18 años</ns-checkbox>
          <p class="ns-auth-form__error" [nsErrorCampo]="form.controls.mayorDeEdad" [nsErrorCampoPara]="mayor"></p>
        </div>

        <div class="ns-auth-form__casilla">
          <ns-checkbox #terminos formControlName="aceptaTerminos">Acepto los términos de uso</ns-checkbox>
          <p
            class="ns-auth-form__error"
            [nsErrorCampo]="form.controls.aceptaTerminos"
            [nsErrorCampoPara]="terminos"
          ></p>
        </div>

        <div class="ns-auth-form__casilla">
          <ns-checkbox #salud formControlName="consentimientoSalud">
            Consiento el tratamiento de mis datos de salud
          </ns-checkbox>
          <button type="button" class="ns-auth-form__enlace-boton" aria-haspopup="dialog" (click)="verDatosSalud()">
            Qué datos tratamos y por qué
          </button>
          <p
            class="ns-auth-form__error"
            [nsErrorCampo]="form.controls.consentimientoSalud"
            [nsErrorCampoPara]="salud"
          ></p>
        </div>
      </fieldset>

      <button nsButton type="submit" size="lg" fullWidth [loading]="enviando()" [disabled]="espera.activa()">
        Crear cuenta
      </button>
    </form>

    <p class="ns-auth-form__pie">
      ¿Ya tienes cuenta? <a class="ns-auth-form__enlace" routerLink="/login">Inicia sesión</a>
    </p>
  `,
  styleUrl: '../auth-formulario.scss',
  styles: `
    fieldset {
      margin: 0;
      padding: 0;
      border: 0;
      min-width: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialogos = inject(NsDialogService);

  // Va aparte para que coincideCon() pueda referirse a ella al declarar el grupo.
  private readonly passwordControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, contrasenaSegura()],
  });

  protected readonly form = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80), noSoloEspacios()],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(254)],
    }),
    password: this.passwordControl,
    confirmarPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, coincideCon(this.passwordControl)],
    }),
    mayorDeEdad: new FormControl(false, { nonNullable: true, validators: casillaMarcada() }),
    aceptaTerminos: new FormControl(false, { nonNullable: true, validators: casillaMarcada() }),
    consentimientoSalud: new FormControl(false, { nonNullable: true, validators: casillaMarcada() }),
  });

  protected readonly password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly espera = new EsperaLimite();

  constructor() {
    // coincideCon solo se ejecuta al cambiar la confirmación: si cambia la contraseña, se revalida.
    this.form.controls.password.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const confirmar = this.form.controls.confirmarPassword;
      if (confirmar.value) confirmar.updateValueAndValidity();
    });
  }

  protected verDatosSalud(): void {
    this.dialogos.open(DatosSaludDialogComponent, { titulo: 'Qué datos tratamos y por qué', size: 'md' });
  }

  protected async registrar(): Promise<void> {
    if (this.enviando() || this.espera.activa()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();
    // Campo a campo: confirmarPassword no se envía (el backend rechaza propiedades desconocidas).
    const peticion: RegistroRequest = {
      nombre: valor.nombre.trim(),
      email: valor.email.trim(),
      password: valor.password,
      mayorDeEdad: valor.mayorDeEdad,
      aceptaTerminos: valor.aceptaTerminos,
      consentimientoSalud: valor.consentimientoSalud,
    };

    this.enviando.set(true);
    this.error.set(null);
    this.espera.limpiar();
    try {
      await firstValueFrom(this.auth.registrar(peticion));
      const estado: EstadoRevisaEmail = { email: peticion.email };
      await this.router.navigateByUrl('/registro/revisa-tu-email', { state: estado });
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
