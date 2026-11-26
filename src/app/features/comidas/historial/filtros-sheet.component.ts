import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { NsButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { FiltrosHistorialComponent } from './filtros-historial.component';
import { type FiltrosHistorial, filtrosPorDefecto } from './historial-comidas.store';

/**
 * Filtros del historial en un bottom sheet (móvil, DESIGN.md §7.9). Los cambios no se aplican hasta
 * pulsar "Aplicar", que cierra con los filtros nuevos.
 */
@Component({
  selector: 'app-filtros-sheet',
  imports: [DialogShellComponent, FiltrosHistorialComponent, NsButtonComponent],
  template: `
    <ns-dialog-shell>
      <app-filtros-historial [valor]="borrador()" (cambio)="alCambiar($event)" />
      <button nsDialogAcciones nsButton type="button" variant="secondary" (click)="restablecer()">Restablecer</button>
      <button nsDialogAcciones nsButton type="button" [disabled]="!valido()" (click)="ref.close(borrador())">
        Aplicar
      </button>
    </ns-dialog-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltrosSheetComponent {
  protected readonly ref = inject<DialogRef<FiltrosHistorial>>(DialogRef);
  protected readonly borrador = signal(inject<FiltrosHistorial>(DIALOG_DATA));
  protected readonly valido = signal(true);

  protected alCambiar(filtros: FiltrosHistorial | null): void {
    this.valido.set(filtros !== null);
    if (filtros) this.borrador.set(filtros);
  }

  protected restablecer(): void {
    this.borrador.set(filtrosPorDefecto());
    this.valido.set(true);
  }
}
