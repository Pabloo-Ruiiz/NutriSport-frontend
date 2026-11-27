import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { ComidaPlanificadaResponse, TipoComida } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA, ORDEN_TIPOS_COMIDA } from '@core/models/etiquetas';
import { formatearFecha } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import type { DestinoComida } from '../planificador-editor';

export interface MoverComidaData {
  comida: ComidaPlanificadaResponse;
  /** Días del menú ("AAAA-MM-DD"): solo se puede mover dentro del menú. */
  fechas: readonly string[];
}

/**
 * "Mover a…" (DESIGN.md §7.10): la alternativa accesible al drag & drop. Elige día (del menú) y
 * franja; se cierra con el destino (DestinoComida) o sin valor si se cancela o no cambia nada.
 */
@Component({
  selector: 'app-mover-comida-dialog',
  imports: [DialogShellComponent, FormsModule, NsButtonComponent, NsFormFieldComponent, NsSelectComponent],
  template: `
    <ns-dialog-shell>
      <form id="ns-mover-form" class="ns-mover" (ngSubmit)="mover()" novalidate>
        <p class="ns-mover__receta">{{ comida.receta.nombre }}</p>
        <ns-form-field label="Día">
          <ns-select name="fecha" [opciones]="dias" [ngModel]="fecha()" (ngModelChange)="fecha.set($event)" />
        </ns-form-field>
        <ns-form-field label="Franja">
          <ns-select
            name="tipoComida"
            [opciones]="franjas"
            [ngModel]="tipoComida()"
            (ngModelChange)="tipoComida.set($event)"
          />
        </ns-form-field>
      </form>

      <button nsDialogAcciones nsButton type="button" variant="secondary" (click)="ref.close()">Cancelar</button>
      <button nsDialogAcciones nsButton type="submit" form="ns-mover-form" [disabled]="!cambia()">Mover</button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-mover {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-mover__receta {
      margin: 0;
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoverComidaDialogComponent {
  protected readonly ref = inject<DialogRef<DestinoComida>>(DialogRef);
  private readonly data = inject<MoverComidaData>(DIALOG_DATA);
  protected readonly comida = this.data.comida;

  protected readonly dias: NsOpcion<string>[] = this.data.fechas.map((f) => ({
    valor: f,
    etiqueta: formatearFecha(f, 'larga'),
  }));
  protected readonly franjas: NsOpcion<TipoComida>[] = ORDEN_TIPOS_COMIDA.filter((t) => t !== 'OTRO').map((t) => ({
    valor: t,
    etiqueta: ETIQUETAS_TIPO_COMIDA[t],
  }));

  protected readonly fecha = signal(this.comida.fecha);
  protected readonly tipoComida = signal<TipoComida>(this.comida.tipoComida ?? 'COMIDA');
  protected readonly cambia = computed(
    () => this.fecha() !== this.comida.fecha || this.tipoComida() !== this.comida.tipoComida,
  );

  protected mover(): void {
    if (!this.cambia()) return;
    this.ref.close({ fecha: this.fecha(), tipoComida: this.tipoComida() });
  }
}
