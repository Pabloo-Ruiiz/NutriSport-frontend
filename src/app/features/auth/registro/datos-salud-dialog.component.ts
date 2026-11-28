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
      <div class="ns-datos-salud">
        <img class="ns-datos-salud__marca-agua" src="marca/logo-watermark.svg" alt="" aria-hidden="true" />
        <app-texto-datos-salud [nivelTitulos]="3" />
      </div>
      <button nsDialogAcciones nsButton type="button" (click)="ref.close()">Entendido</button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-datos-salud {
      position: relative;
      isolation: isolate;
    }
    // Isotipo de fondo, muy tenue, para mantener la identidad del registro sin restar legibilidad.
    .ns-datos-salud__marca-agua {
      position: absolute;
      z-index: -1;
      top: 50%;
      right: -8%;
      width: min(60%, 320px);
      height: auto;
      opacity: 0.05;
      transform: translateY(-50%);
      pointer-events: none;
      user-select: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatosSaludDialogComponent {
  protected readonly ref = inject(DialogRef);
}
