import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NsButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { TextoDatosSaludComponent } from '../componentes/texto-datos-salud.component';

/**
 * "Qué datos tratamos y por qué" (DESIGN.md §7.2): qué datos de salud se guardan, qué se envía al
 * proveedor de IA y cómo revocar el consentimiento. Se abre desde el registro.
 */
@Component({
  selector: 'app-datos-salud-dialog',
  imports: [DialogShellComponent, NsButtonComponent, TextoDatosSaludComponent],
  template: `
    <ns-dialog-shell>
      <app-texto-datos-salud [nivelTitulos]="3" />
      <button nsDialogAcciones nsButton type="button" (click)="ref.close()">Entendido</button>
    </ns-dialog-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatosSaludDialogComponent {
  protected readonly ref = inject(DialogRef);
}
