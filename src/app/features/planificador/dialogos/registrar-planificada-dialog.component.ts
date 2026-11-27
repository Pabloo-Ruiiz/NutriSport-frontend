import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { ComidaPlanificadaResponse } from '@core/models';
import { aHoraApi, hoyLocal } from '@core/util/fechas';
import { formatearFecha } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';

export interface RegistrarPlanificadaData {
  comida: ComidaPlanificadaResponse;
}

/** Resultado: la hora "HH:mm" elegida o null (sin hora). Sin valor si se cancela. */
export interface RegistrarPlanificadaResultado {
  hora: string | null;
}

const HORA = /^\d{2}:\d{2}$/;

/**
 * Registrar una comida planificada como consumida (docs/api/menus.md §7.5): hora opcional (si es
 * de hoy, se propone la actual). Se cierra con la hora; quien lo abre hace el POST …/registrar?hora=.
 */
@Component({
  selector: 'app-registrar-planificada-dialog',
  imports: [DialogShellComponent, FormsModule, NsButtonComponent, NsFormFieldComponent, NsInputDirective],
  template: `
    <ns-dialog-shell>
      <form id="ns-registrar-plan-form" class="ns-reg-plan" (ngSubmit)="registrar()" novalidate>
        <p class="ns-reg-plan__receta">
          <strong>{{ comida.receta.nombre }}</strong>
          <span>{{ fecha }}</span>
        </p>
        <ns-form-field label="Hora" hint="Opcional. Se añade a tus comidas de ese día con las cantidades del plan.">
          <input nsInput type="time" name="hora" [ngModel]="hora()" (ngModelChange)="hora.set($event ?? '')" />
        </ns-form-field>
      </form>

      <button nsDialogAcciones nsButton type="button" variant="secondary" (click)="ref.close()">Cancelar</button>
      <button nsDialogAcciones nsButton type="submit" form="ns-registrar-plan-form" icon="circle-check">
        Registrar
      </button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-reg-plan {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-reg-plan__receta {
      display: flex;
      flex-direction: column;
      margin: 0;
      span {
        color: var(--ns-text-secondary);
        font-size: 0.8125rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarPlanificadaDialogComponent {
  protected readonly ref = inject<DialogRef<RegistrarPlanificadaResultado>>(DialogRef);
  protected readonly comida = inject<RegistrarPlanificadaData>(DIALOG_DATA).comida;
  protected readonly fecha = formatearFecha(this.comida.fecha, 'larga');

  protected readonly hora = signal(this.comida.fecha === hoyLocal() ? aHoraApi(new Date()) : '');

  protected registrar(): void {
    const hora = this.hora().slice(0, 5);
    this.ref.close({ hora: HORA.test(hora) ? hora : null });
  }
}
