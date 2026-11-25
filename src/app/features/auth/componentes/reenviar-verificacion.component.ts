import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { aApiError } from '@core/util/api-error';
import { EsperaLimite } from '@core/util/espera-limite';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';

/**
 * Reenviar el email de verificación (POST /auth/reenviar-verificacion). Con `email` solo muestra el
 * botón; sin él, pide el email. Responde siempre 202 con el mismo mensaje (NutriSport_API.md
 * §2.4), así que el toast tampoco dice si la cuenta existe. Respeta el 429 (3 por hora).
 *
 *   <app-reenviar-verificacion [email]="email" />
 */
@Component({
  selector: 'app-reenviar-verificacion',
  imports: [ReactiveFormsModule, NsButtonComponent, NsAlertComponent, NsFormFieldComponent, NsInputDirective],
  template: `
    <form class="ns-reenviar" (submit)="reenviar($event)" novalidate>
      @if (espera.mensaje(); as mensaje) {
        <ns-alert type="warning" titulo="Demasiados envíos">{{ mensaje }}</ns-alert>
      } @else if (error(); as error) {
        <ns-alert type="error">{{ error }}</ns-alert>
      }

      @if (!email()) {
        <ns-form-field label="Email" [hint]="ayuda()">
          <input nsInput type="email" [formControl]="campoEmail" autocomplete="email" inputmode="email" />
        </ns-form-field>
      }

      <button
        nsButton
        type="submit"
        [variant]="variante()"
        fullWidth
        [loading]="enviando()"
        [disabled]="espera.activa()"
      >
        {{ textoBoton() }}
      </button>
    </form>
  `,
  styles: `
    .ns-reenviar {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
      text-align: left;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReenviarVerificacionComponent {
  /** Email conocido (estado de navegación, cuenta en memoria). Si falta, se pide. */
  readonly email = input<string | null | undefined>(null);
  readonly textoBoton = input('Reenviar');
  readonly variante = input<'primary' | 'secondary'>('secondary');
  readonly ayuda = input('Escribe el email con el que te registraste.');

  private readonly auth = inject(AuthService);
  private readonly toasts = inject(NsToastService);

  protected readonly campoEmail = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly espera = new EsperaLimite();

  protected async reenviar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.enviando() || this.espera.activa()) return;

    const conocido = this.email();
    if (!conocido && this.campoEmail.invalid) {
      this.campoEmail.markAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    this.espera.limpiar();
    try {
      await firstValueFrom(this.auth.reenviarVerificacion((conocido || this.campoEmail.value).trim()));
      this.toasts.exito('Enlace reenviado', 'Si los datos son correctos, recibirás un nuevo email en unos minutos.');
    } catch (e) {
      const error = aApiError(e);
      if (error.status === 429) this.espera.iniciar(error.retryAfterSegundos);
      else this.error.set(error.detalle);
    } finally {
      this.enviando.set(false);
    }
  }
}
