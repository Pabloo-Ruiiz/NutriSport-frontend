import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { MenuResponse, MenuResumenResponse } from '@core/models';
import { MenusService } from '@core/services/menus.service';
import { aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { MAX_NOMBRE_MENU } from './generar-menu-dialog.component';

export interface RenombrarMenuData {
  menu: Pick<MenuResumenResponse, 'id' | 'nombre'>;
}

/** Cambiar el nombre de un menú → PATCH /menus/{id} { nombre }. Se cierra con el menú actualizado. */
@Component({
  selector: 'app-renombrar-menu-dialog',
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
      <form id="ns-renombrar-form" class="ns-renombrar" (ngSubmit)="guardar()" novalidate>
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
            descritoPor="ns-renombrar-error"
          />
        </ns-form-field>
        <p class="ns-renombrar__error" id="ns-renombrar-error" [hidden]="!errorNombre()">{{ errorNombre() }}</p>

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
      <button nsDialogAcciones nsButton type="submit" form="ns-renombrar-form" [loading]="guardando()">Guardar</button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-renombrar {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-renombrar__error {
      margin: calc(-1 * var(--ns-space-3)) 0 0;
      color: var(--ns-error);
      font-size: 0.8125rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenombrarMenuDialogComponent {
  protected readonly ref = inject<DialogRef<MenuResponse>>(DialogRef);
  private readonly menusService = inject(MenusService);
  private readonly menu = inject<RenombrarMenuData>(DIALOG_DATA).menu;

  protected readonly maxNombre = MAX_NOMBRE_MENU;
  protected readonly nombre = signal(this.menu.nombre);
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
    if (nombre === this.menu.nombre) {
      this.ref.close();
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    this.menusService.actualizar(this.menu.id, { nombre: nombre.slice(0, MAX_NOMBRE_MENU) }).subscribe({
      next: (menu) => this.ref.close(menu),
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
