import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ConfirmDialogComponent, NsConfirmOpciones } from './confirm-dialog.component';
import { NsDialogService } from './dialog.service';

/**
 * Pide confirmación al usuario con un diálogo (DESIGN.md §5.6). Las acciones destructivas usan
 * `peligro` (botón danger) y un mensaje que explica la consecuencia.
 *
 *   if (await this.confirmacion.confirmar({ titulo: '¿Eliminar la comida?', mensaje: '…',
 *       textoConfirmar: 'Eliminar', peligro: true })) { … }
 *
 *   const password = await this.confirmacion.confirmar({ …, pedirPassword: true });
 *   if (password) this.cuenta.eliminar(password);   // false si se canceló
 */
@Injectable({ providedIn: 'root' })
export class NsConfirmService {
  private readonly dialogos = inject(NsDialogService);

  /** Con pedirPassword: la contraseña escrita, o false si se cancela. */
  confirmar(opciones: NsConfirmOpciones & { pedirPassword: true }): Promise<string | false>;
  /** true si confirma; false si cancela, pulsa Escape o hace clic fuera. */
  confirmar(opciones: NsConfirmOpciones): Promise<boolean>;
  async confirmar(opciones: NsConfirmOpciones): Promise<boolean | string> {
    const ref = this.dialogos.open<ConfirmDialogComponent, boolean | string, NsConfirmOpciones>(
      ConfirmDialogComponent,
      {
        titulo: opciones.titulo,
        size: 'sm',
        data: opciones,
      },
    );
    const resultado = await firstValueFrom(ref.closed);
    return resultado ?? false;
  }
}
