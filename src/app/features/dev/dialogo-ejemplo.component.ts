import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { DialogShellComponent, NsButtonComponent, NsFormFieldComponent, NsInputDirective } from '@shared/ui';

export interface DatosDialogoEjemplo {
  tamano: string;
  parrafos: number;
}

/** Diálogo de muestra para /dev/componentes: cuerpo con scroll, un campo y acciones. */
@Component({
  selector: 'app-dialogo-ejemplo',
  imports: [ReactiveFormsModule, DialogShellComponent, NsButtonComponent, NsFormFieldComponent, NsInputDirective],
  template: `
    <ns-dialog-shell>
      <form id="dialogo-ejemplo" class="ns-stack" (submit)="guardar($event)">
        <p class="ns-text-body ns-text-secondary">
          Diálogo de tamaño <code>{{ datos.tamano }}</code>. En móvil se abre como bottom sheet.
        </p>
        <ns-form-field label="Nombre de la comida" obligatorio>
          <input nsInput [formControl]="nombre" placeholder="Desayuno de domingo" />
        </ns-form-field>
        @for (parrafo of parrafos; track $index) {
          <p class="ns-text-body ns-text-secondary">
            Párrafo {{ $index + 1 }} para comprobar el scroll del cuerpo: la cabecera y el pie se quedan fijos.
          </p>
        }
      </form>
      <button nsDialogAcciones nsButton type="button" variant="secondary" (click)="ref.close()">Cancelar</button>
      <button nsDialogAcciones nsButton type="submit" form="dialogo-ejemplo">Guardar comida</button>
    </ns-dialog-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogoEjemploComponent {
  protected readonly datos = inject<DatosDialogoEjemplo>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string>>(DialogRef);
  protected readonly nombre = new FormControl('', { nonNullable: true, validators: Validators.required });
  protected readonly parrafos = Array.from({ length: this.datos.parrafos });

  protected guardar(evento: Event): void {
    evento.preventDefault();
    if (this.nombre.invalid) {
      this.nombre.markAsTouched();
      return;
    }
    this.ref.close(this.nombre.value);
  }
}
