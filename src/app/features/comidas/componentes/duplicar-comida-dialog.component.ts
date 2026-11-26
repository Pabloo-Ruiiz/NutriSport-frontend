import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { RegistroComidaResponse, TipoComida } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA, ORDEN_TIPOS_COMIDA } from '@core/models/etiquetas';
import { ComidasService } from '@core/services/comidas.service';
import { aApiError } from '@core/util/api-error';
import { hoyLocal, sumarDias } from '@core/util/fechas';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { etiquetaTipo, resumirAlimentos } from './comida-util';

export interface DuplicarComidaData {
  comida: RegistroComidaResponse;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Duplicar una comida en otra fecha (DESIGN.md §7.9): fecha (hoy por defecto, como mucho mañana) y,
 * opcionalmente, otro tipo de comida → POST /comidas/{id}/duplicar. Se cierra con la comida nueva
 * (origen COPIA); sin valor si se cancela.
 *
 *   this.dialogos.open<DuplicarComidaDialogComponent, RegistroComidaResponse, DuplicarComidaData>(
 *     DuplicarComidaDialogComponent, { titulo: 'Duplicar comida', size: 'sm', data: { comida } });
 */
@Component({
  selector: 'app-duplicar-comida-dialog',
  imports: [
    DialogShellComponent,
    FormsModule,
    NsAlertComponent,
    NsButtonComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsSelectComponent,
  ],
  template: `
    <ns-dialog-shell>
      <form id="ns-duplicar-form" class="ns-duplicar" (ngSubmit)="duplicar()" novalidate>
        <p class="ns-duplicar__origen">
          <span class="ns-duplicar__tipo">{{ tipoOriginal }}</span>
          <span class="ns-duplicar__alimentos">{{ alimentos }}</span>
        </p>

        <ns-form-field label="Fecha" obligatorio>
          <input
            nsInput
            type="date"
            name="fecha"
            [max]="fechaMaxima"
            [ngModel]="fecha()"
            (ngModelChange)="cambiarFecha($event)"
            [invalido]="!!errorFecha()"
            descritoPor="ns-duplicar-error-fecha"
          />
        </ns-form-field>
        <p class="ns-duplicar__error" id="ns-duplicar-error-fecha" [hidden]="!errorFecha()">{{ errorFecha() }}</p>

        <ns-form-field label="Tipo de comida" hint="Si no lo cambias, se mantiene el de la original.">
          <ns-select
            name="tipoComida"
            [opciones]="tipos"
            [ngModel]="tipoComida()"
            (ngModelChange)="tipoComida.set($event)"
          />
        </ns-form-field>

        @if (error(); as error) {
          <ns-alert type="error">{{ error }}</ns-alert>
        }
      </form>

      <button
        nsDialogAcciones
        nsButton
        type="button"
        variant="secondary"
        [disabled]="guardando()"
        (click)="ref.close()"
      >
        Cancelar
      </button>
      <button nsDialogAcciones nsButton type="submit" form="ns-duplicar-form" icon="copy" [loading]="guardando()">
        Duplicar
      </button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-duplicar {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-duplicar__origen {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: var(--ns-space-3);
      border-radius: var(--ns-radius-md);
      background: var(--ns-surface-muted);
    }
    .ns-duplicar__tipo {
      font-weight: 600;
    }
    .ns-duplicar__alimentos {
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
    }
    .ns-duplicar__error {
      margin: calc(-1 * var(--ns-space-3)) 0 0;
      color: var(--ns-error);
      font-size: 0.8125rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuplicarComidaDialogComponent {
  protected readonly ref = inject<DialogRef<RegistroComidaResponse>>(DialogRef);
  private readonly comidasService = inject(ComidasService);
  private readonly comida = inject<DuplicarComidaData>(DIALOG_DATA).comida;

  protected readonly fechaMaxima = sumarDias(hoyLocal(), 1);
  protected readonly tipoOriginal = etiquetaTipo(this.comida);
  protected readonly alimentos = resumirAlimentos(this.comida.alimentos.map((a) => a.nombre));

  /** null: se mantiene el tipo de la original. */
  protected readonly tipos: NsOpcion<TipoComida | null>[] = [
    { valor: null, etiqueta: `El de la original (${this.tipoOriginal})` },
    ...ORDEN_TIPOS_COMIDA.map((valor) => ({ valor, etiqueta: ETIQUETAS_TIPO_COMIDA[valor] })),
  ];

  protected readonly fecha = signal(hoyLocal());
  protected readonly tipoComida = signal<TipoComida | null>(null);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorFecha = signal<string | null>(null);

  protected cambiarFecha(fecha: string): void {
    this.fecha.set(fecha);
    this.errorFecha.set(null);
  }

  protected duplicar(): void {
    if (this.guardando()) return;
    const fecha = this.fecha();
    if (!FECHA.test(fecha)) {
      this.errorFecha.set('Indica la fecha.');
      return;
    }
    if (fecha > this.fechaMaxima) {
      this.errorFecha.set('La fecha puede ser como mucho mañana.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.comidasService.duplicar(this.comida.id, { fecha, tipoComida: this.tipoComida() ?? undefined }).subscribe({
      next: (nueva) => this.ref.close(nueva),
      error: (e: unknown) => {
        const error = aApiError(e);
        const deFecha = error.errores.find((c) => c.campo === 'fecha');
        if (deFecha) this.errorFecha.set(deFecha.mensaje);
        else this.error.set(error.detalle);
        this.guardando.set(false);
      },
    });
  }
}
