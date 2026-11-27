import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { ListaCompraResponse, ListaCompraResumenResponse } from '@core/models';
import { ListasCompraService } from '@core/services/listas-compra.service';
import { aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { MAX_NOMBRE_LISTA } from './compra';

export interface RenombrarListaData {
  lista: Pick<ListaCompraResumenResponse, 'id' | 'nombre'>;
}

/** Cambiar el nombre de una lista → PATCH /listas-compra/{id} { nombre }. Se cierra con la lista actualizada. */
@Component({
  selector: 'app-renombrar-lista-dialog',
  imports: [
    DialogShellComponent,
    FormsModule,
    NsAlertComponent,
    NsButtonComponent,
    NsFormFieldComponent,
    NsInputDirective,
  ],
  template: `
    <ns-dialog-shell>
      <form id="ns-renombrar-lista-form" class="ns-renombrar-lista" (ngSubmit)="guardar()" novalidate>
        <ns-form-field label="Nombre" obligatorio>
          <input
            nsInput
            type="text"
            name="nombre"
            autocomplete="off"
            [maxlength]="maxNombre"
            [ngModel]="nombre()"
            (ngModelChange)="cambiar($event)"
            [invalido]="!!errorNombre()"
            descritoPor="ns-renombrar-lista-error"
          />
        </ns-form-field>
        <p class="ns-renombrar-lista__error" id="ns-renombrar-lista-error" [hidden]="!errorNombre()">
          {{ errorNombre() }}
        </p>

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
      <button nsDialogAcciones nsButton type="submit" form="ns-renombrar-lista-form" [loading]="guardando()">
        Guardar
      </button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-renombrar-lista {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-renombrar-lista__error {
      margin: calc(-1 * var(--ns-space-3)) 0 0;
      color: var(--ns-error);
      font-size: 0.8125rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenombrarListaDialogComponent {
  protected readonly ref = inject<DialogRef<ListaCompraResponse>>(DialogRef);
  private readonly listasService = inject(ListasCompraService);
  private readonly lista = inject<RenombrarListaData>(DIALOG_DATA).lista;

  protected readonly maxNombre = MAX_NOMBRE_LISTA;
  protected readonly nombre = signal(this.lista.nombre);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorNombre = signal<string | null>(null);

  protected cambiar(nombre: string): void {
    this.nombre.set(nombre);
    this.errorNombre.set(null);
  }

  protected guardar(): void {
    if (this.guardando()) return;
    const nombre = this.nombre().trim();
    if (!nombre) {
      this.errorNombre.set('Escribe un nombre.');
      return;
    }
    if (nombre === this.lista.nombre) {
      this.ref.close();
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    this.listasService.actualizar(this.lista.id, { nombre: nombre.slice(0, MAX_NOMBRE_LISTA) }).subscribe({
      next: (lista) => this.ref.close(lista),
      error: (e: unknown) => {
        const error = aApiError(e);
        const deNombre = error.errores.find((c) => c.campo === 'nombre');
        if (deNombre) this.errorNombre.set(deNombre.mensaje);
        else this.error.set(error.detalle);
        this.guardando.set(false);
      },
    });
  }
}
