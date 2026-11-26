import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NsButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { ComidaEnConstruccionComponent } from './comida-en-construccion.component';

/** Lo que devuelve el bottom sheet: 'guardar' si se pulsa "Guardar comida". */
export type ResultadoComidaSheet = 'guardar' | undefined;

/**
 * Bottom sheet de móvil con la comida en construcción (DESIGN.md §7.6). Se abre con el inyector del
 * registro para compartir su ComidaEditorStore. "Guardar comida" cierra con 'guardar' y el
 * registro guarda.
 */
@Component({
  selector: 'app-comida-sheet',
  imports: [DialogShellComponent, NsButtonComponent, ComidaEnConstruccionComponent],
  template: `
    <ns-dialog-shell>
      <app-comida-en-construccion [nivelTitulo]="2" />
      <button nsDialogAcciones nsButton type="button" variant="secondary" (click)="ref.close()">
        Seguir añadiendo
      </button>
      <button nsDialogAcciones nsButton type="button" (click)="ref.close('guardar')">Guardar comida</button>
    </ns-dialog-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComidaSheetComponent {
  protected readonly ref = inject<DialogRef<ResultadoComidaSheet>>(DialogRef);
}
