import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import type { PesoResponse } from '@core/models';
import { SeguimientoService } from '@core/services/seguimiento.service';
import { aApiError } from '@core/util/api-error';
import { hoyLocal } from '@core/util/fechas';
import { aplicarErroresServidor } from '@core/util/formularios';
import { fechaNoFutura } from '@core/util/validadores';
import { formatearFecha, formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsQuantityInputComponent } from '@shared/ui/form/quantity-input.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';

export interface DatosRegistrarPeso {
  /** Último peso conocido, para empezar desde él (p. ej. el del perfil). */
  pesoKg?: number | null;
}

/**
 * Registrar un pesaje (DESIGN.md §7.18): fecha (hoy por defecto, no futura) y peso en kg con un
 * decimal (30–250). Se abre con tamaño sm (bottom sheet en móvil):
 *
 *   const ref = dialogos.open<RegistrarPesoDialogComponent, PesoResponse, DatosRegistrarPeso>(
 *     RegistrarPesoDialogComponent, { titulo: 'Registrar peso', size: 'sm', data: { pesoKg: 71.4 } });
 *   ref.closed.subscribe((pesaje) => …);   // PesoResponse, o undefined si se cancela
 *
 * Al guardar muestra el toast "Peso guardado". Si ya hay un pesaje ese día, el backend lo sustituye.
 */
@Component({
  selector: 'app-registrar-peso-dialog',
  imports: [
    ReactiveFormsModule,
    DialogShellComponent,
    NsAlertComponent,
    NsButtonComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsQuantityInputComponent,
  ],
  template: `
    <ns-dialog-shell>
      <form class="ns-peso" [id]="idFormulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        @if (error(); as error) {
          <ns-alert type="error">{{ error }}</ns-alert>
        }
        <ns-form-field label="Fecha" hint="Si ese día ya tienes un pesaje, lo sustituye." obligatorio>
          <input nsInput type="date" formControlName="fecha" [max]="hoy" />
        </ns-form-field>
        <ns-form-field label="Peso" hint="Entre 30 y 250 kg, con un decimal." obligatorio>
          <ns-quantity-input formControlName="pesoKg" [min]="30" [max]="250" [step]="0.1" [decimales]="1" unit="kg" />
        </ns-form-field>
      </form>
      <button nsDialogAcciones nsButton type="button" variant="secondary" (click)="ref.close()">Cancelar</button>
      <button nsDialogAcciones nsButton type="submit" [attr.form]="idFormulario" [loading]="enviando()">
        Guardar peso
      </button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-peso {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarPesoDialogComponent {
  protected readonly ref = inject<DialogRef<PesoResponse>>(DialogRef);
  private readonly datos = inject<DatosRegistrarPeso | null>(DIALOG_DATA, { optional: true });
  private readonly seguimiento = inject(SeguimientoService);
  private readonly toasts = inject(NsToastService);

  protected readonly idFormulario = 'ns-registrar-peso';
  protected readonly hoy = hoyLocal();

  protected readonly form = new FormGroup({
    fecha: new FormControl(this.hoy, { nonNullable: true, validators: [Validators.required, fechaNoFutura()] }),
    pesoKg: new FormControl<number | null>(this.datos?.pesoKg ?? null, [
      Validators.required,
      Validators.min(30),
      Validators.max(250),
    ]),
  });

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async guardar(): Promise<void> {
    if (this.enviando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { fecha, pesoKg } = this.form.getRawValue();
    this.enviando.set(true);
    this.error.set(null);
    try {
      // Un decimal: el campo ya redondea al salir, pero puede enviarse sin haber salido de él.
      const pesaje = await firstValueFrom(
        this.seguimiento.registrarPeso({ fecha, pesoKg: Math.round(Number(pesoKg) * 10) / 10 }),
      );
      this.toasts.exito(
        'Peso guardado',
        `${formatearNumero(pesaje.pesoKg, 1)} kg el ${formatearFecha(pesaje.fecha, 'larga')}.`,
      );
      this.ref.close(pesaje);
    } catch (e) {
      const error = aApiError(e);
      if (error.status === 400 && aplicarErroresServidor(this.form, error)) return;
      this.error.set(error.detalle);
    } finally {
      this.enviando.set(false);
    }
  }
}
