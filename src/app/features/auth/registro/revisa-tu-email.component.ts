import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { aApiError } from '@core/util/api-error';
import { EsperaLimite } from '@core/util/espera-limite';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import type { EstadoRevisaEmail } from './registro.component';

/**
 * "Revisa tu email" tras el registro (DESIGN.md §7.2). El texto es siempre el mismo, exista o no
 * la cuenta (NutriSport_API.md §2.4). "Reenviar" llama a POST /auth/reenviar-verificacion con el
 * email del estado de navegación; si no lo hay (se ha recargado la página o se ha llegado por un
 * enlace), se pide.
 */
@Component({
  selector: 'app-revisa-tu-email',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NsButtonComponent,
    NsAlertComponent,
    NsEmptyStateComponent,
    NsFormFieldComponent,
    NsInputDirective,
  ],
  template: `
    <ns-empty-state
      icon="mail-check"
      titulo="Revisa tu email"
      descripcion="Si los datos son correctos, te hemos enviado un enlace para verificar tu cuenta. Caduca en 24 horas."
      [nivelTitulo]="1"
    >
      <div class="ns-revisa">
        @if (espera.mensaje(); as mensaje) {
          <ns-alert type="warning" titulo="Demasiados envíos">{{ mensaje }}</ns-alert>
        } @else if (error(); as error) {
          <ns-alert type="error">{{ error }}</ns-alert>
        }

        @if (!emailConocido) {
          <ns-form-field label="Email" hint="Escribe el email con el que te registraste para reenviar el enlace.">
            <input nsInput type="email" [formControl]="email" autocomplete="email" inputmode="email" />
          </ns-form-field>
        }

        <button
          nsButton
          type="button"
          variant="secondary"
          fullWidth
          [loading]="enviando()"
          [disabled]="espera.activa()"
          (click)="reenviar()"
        >
          Reenviar
        </button>
        <a class="ns-revisa__enlace" routerLink="/login">Ir a iniciar sesión</a>
      </div>
    </ns-empty-state>
  `,
  styles: `
    .ns-revisa {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: var(--ns-space-4);
      width: 100%;
      max-width: 400px;
      text-align: left;
    }
    .ns-revisa__enlace {
      align-self: center;
      color: var(--ns-text-link);
      font-weight: 600;
      text-underline-offset: 2px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevisaTuEmailComponent {
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(NsToastService);

  private readonly estado = inject(Location).getState() as Partial<EstadoRevisaEmail> | null;
  protected readonly emailConocido = typeof this.estado?.email === 'string' && this.estado.email !== '';

  protected readonly email = new FormControl(this.emailConocido ? this.estado!.email! : '', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly espera = new EsperaLimite();

  protected async reenviar(): Promise<void> {
    if (this.enviando() || this.espera.activa()) return;
    if (this.email.invalid) {
      this.email.markAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    this.espera.limpiar();
    try {
      await firstValueFrom(this.auth.reenviarVerificacion(this.email.value.trim()));
      // Siempre el mismo texto (§2.4): no se deduce si la cuenta existe.
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
