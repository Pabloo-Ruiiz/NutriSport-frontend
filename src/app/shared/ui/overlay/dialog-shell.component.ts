import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { idUnico } from '../form/control-campo';
import { NS_DIALOG_CONTEXTO } from './dialog.service';

/**
 * Estructura de un diálogo (DESIGN.md §5.6): cabecera con título h4 y botón cerrar, cuerpo con
 * scroll y pie de acciones. En móvil añade el asa del bottom sheet y el margen del safe-area.
 *
 *   <ns-dialog-shell>
 *     <p>Contenido…</p>
 *     <button nsDialogAcciones nsButton variant="secondary" (click)="ref.close()">Cancelar</button>
 *     <button nsDialogAcciones nsButton (click)="guardar()">Guardar</button>
 *   </ns-dialog-shell>
 *
 * Cada botón del pie lleva nsDialogAcciones (la acción principal, la última). En el bottom sheet
 * van a ancho completo y la principal arriba.
 *
 * El título llega del servicio (NsDialogService.open(…, { titulo })) o del input `titulo`.
 */
@Component({
  selector: 'ns-dialog-shell',
  imports: [LucideDynamicIcon],
  template: `
    @if (sheet) {
      <span class="ns-dialog__asa" aria-hidden="true"></span>
    }
    <header class="ns-dialog__cabecera">
      <h2 class="ns-dialog__titulo ns-text-h4" [id]="idTitulo">{{ tituloVisible() }}</h2>
      @if (!dialogRef?.disableClose) {
        <button type="button" class="ns-dialog__cerrar" [attr.aria-label]="etiquetaCerrar()" (click)="cerrar()">
          <svg lucideIcon="x" [size]="20" aria-hidden="true"></svg>
        </button>
      }
    </header>
    <div class="ns-dialog__cuerpo"><ng-content /></div>
    <footer class="ns-dialog__pie"><ng-content select="[nsDialogAcciones]" /></footer>
  `,
  styleUrl: './dialog-shell.component.scss',
  host: {
    class: 'ns-dialog',
    '[class.ns-dialog--sheet]': 'sheet',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogShellComponent {
  /** Título si el diálogo no se abrió con NsDialogService (o para cambiarlo). */
  readonly titulo = input<string>();
  readonly etiquetaCerrar = input('Cerrar');

  protected readonly dialogRef = inject(DialogRef, { optional: true });
  private readonly contexto = inject(NS_DIALOG_CONTEXTO, { optional: true });

  protected readonly sheet = this.contexto?.sheet ?? false;
  protected readonly idTitulo = this.contexto?.idTitulo ?? idUnico('ns-dialog-titulo');
  protected readonly tituloVisible = computed(() => this.titulo() ?? this.contexto?.titulo ?? '');

  protected cerrar(): void {
    this.dialogRef?.close();
  }
}
