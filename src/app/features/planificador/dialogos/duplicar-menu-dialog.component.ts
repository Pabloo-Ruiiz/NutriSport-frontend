import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { MenuResponse, MenuResumenResponse } from '@core/models';
import { MenusService } from '@core/services/menus.service';
import { aApiError } from '@core/util/api-error';
import { hoyLocal } from '@core/util/fechas';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { fechaInicioSugerida } from '../planificador';
import { MAX_NOMBRE_MENU } from './generar-menu-dialog.component';

export interface DuplicarMenuData {
  menu: Pick<MenuResumenResponse, 'id' | 'nombre' | 'tipo'>;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Reutilizar un menú en otras fechas (docs/api/menus.md §6): fecha de inicio (no anterior a hoy; para
 * uno semanal se propone el próximo lunes) y nombre opcional ("Copia de …" si se deja vacío) →
 * POST /menus/{id}/duplicar. Se cierra con la copia; sin valor si se cancela.
 */
@Component({
  selector: 'app-duplicar-menu-dialog',
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
      <form id="ns-dup-menu-form" class="ns-dup-menu" (ngSubmit)="duplicar()" novalidate>
        <ns-form-field label="Fecha de inicio" obligatorio>
          <input
            nsInput
            type="date"
            name="fechaInicio"
            [min]="hoy"
            [ngModel]="fecha()"
            (ngModelChange)="cambiarFecha($event)"
            [invalido]="!!errorFecha()"
            descritoPor="ns-dup-menu-error-fecha"
          />
        </ns-form-field>
        <p class="ns-dup-menu__error" id="ns-dup-menu-error-fecha" [hidden]="!errorFecha()">{{ errorFecha() }}</p>

        <ns-form-field label="Nombre" [hint]="'Opcional. Si lo dejas vacío: «' + nombrePorDefecto + '».'">
          <input
            nsInput
            type="text"
            name="nombre"
            autocomplete="off"
            [maxlength]="maxNombre"
            [ngModel]="nombre()"
            (ngModelChange)="nombre.set($event)"
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
      <button nsDialogAcciones nsButton type="submit" form="ns-dup-menu-form" icon="copy" [loading]="guardando()">
        Duplicar
      </button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-dup-menu {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-dup-menu__error {
      margin: calc(-1 * var(--ns-space-3)) 0 0;
      color: var(--ns-error);
      font-size: 0.8125rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuplicarMenuDialogComponent {
  protected readonly ref = inject<DialogRef<MenuResponse>>(DialogRef);
  private readonly menusService = inject(MenusService);
  private readonly menu = inject<DuplicarMenuData>(DIALOG_DATA).menu;

  protected readonly hoy = hoyLocal();
  protected readonly maxNombre = MAX_NOMBRE_MENU;
  protected readonly nombrePorDefecto = `Copia de ${this.menu.nombre}`;

  protected readonly fecha = signal(fechaInicioSugerida(this.menu.tipo, this.hoy));
  protected readonly nombre = signal('');
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorFecha = signal<string | null>(null);

  protected cambiarFecha(fecha: string): void {
    this.fecha.set(fecha);
    this.errorFecha.set(null);
  }

  protected duplicar(): void {
    if (this.guardando()) return;
    const fechaInicio = this.fecha();
    if (!FECHA.test(fechaInicio)) {
      this.errorFecha.set('Indica la fecha de inicio.');
      return;
    }
    if (fechaInicio < this.hoy) {
      this.errorFecha.set('La fecha de inicio no puede ser anterior a hoy.');
      return;
    }

    const nombre = this.nombre().trim();
    this.guardando.set(true);
    this.error.set(null);
    this.menusService
      .duplicar(this.menu.id, { fechaInicio, ...(nombre ? { nombre: nombre.slice(0, MAX_NOMBRE_MENU) } : {}) })
      .subscribe({
        next: (copia) => this.ref.close(copia),
        error: (e: unknown) => {
          const error = aApiError(e);
          const deFecha = error.errores.find((c) => c.campo === 'fechaInicio');
          if (deFecha) this.errorFecha.set(deFecha.mensaje);
          else this.error.set(error.detalle);
          this.guardando.set(false);
        },
      });
  }
}
