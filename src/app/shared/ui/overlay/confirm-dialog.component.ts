import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { NsButtonComponent } from '../button/button.component';
import { idUnico } from '../form/control-campo';
import { NsFormFieldComponent } from '../form/form-field.component';
import { NsInputDirective } from '../form/input.directive';
import { DialogShellComponent } from './dialog-shell.component';

export interface NsConfirmOpciones {
  titulo: string;
  /** Explica la consecuencia (§5.6): "Se borrarán tus comidas, tu plan y tu historial." */
  mensaje: string;
  /** Texto del botón de confirmar: un verbo de acción ("Eliminar cuenta"), no "Aceptar". */
  textoConfirmar?: string;
  textoCancelar?: string;
  /** Acción destructiva: botón danger y foco inicial en Cancelar. */
  peligro?: boolean;
  /** Pide la contraseña antes de confirmar y la devuelve (p. ej. para eliminar la cuenta). */
  pedirPassword?: boolean;
}

/**
 * Diálogo de confirmación de NsConfirmService. Se cierra con:
 * - false al cancelar (o con Escape / clic fuera),
 * - true al confirmar,
 * - la contraseña escrita, si se pidió.
 */
@Component({
  selector: 'ns-confirm-dialog',
  imports: [ReactiveFormsModule, DialogShellComponent, NsButtonComponent, NsFormFieldComponent, NsInputDirective],
  template: `
    <ns-dialog-shell>
      <form class="ns-confirm" [id]="idFormulario" (submit)="confirmar($event)" novalidate>
        <p class="ns-confirm__mensaje">{{ opciones.mensaje }}</p>
        @if (opciones.pedirPassword) {
          <ns-form-field label="Contraseña" hint="Escribe tu contraseña actual para confirmar." obligatorio>
            <input nsInput type="password" autocomplete="current-password" [formControl]="password" cdkFocusInitial />
          </ns-form-field>
        }
      </form>
      <button
        nsDialogAcciones
        nsButton
        type="button"
        variant="secondary"
        (click)="cancelar()"
        [attr.cdkFocusInitial]="focoEnCancelar"
      >
        {{ opciones.textoCancelar ?? 'Cancelar' }}
      </button>
      <button
        nsDialogAcciones
        nsButton
        type="submit"
        [attr.form]="idFormulario"
        [variant]="opciones.peligro ? 'danger' : 'primary'"
      >
        {{ opciones.textoConfirmar ?? 'Confirmar' }}
      </button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-confirm {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-5);
    }
    .ns-confirm__mensaje {
      color: var(--ns-text-secondary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  protected readonly opciones = inject<NsConfirmOpciones>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<boolean | string>>(DialogRef);

  protected readonly idFormulario = idUnico('ns-confirm');
  protected readonly password = new FormControl('', { nonNullable: true, validators: Validators.required });
  /** En las acciones destructivas sin contraseña, el foco empieza en la opción segura. */
  protected readonly focoEnCancelar = this.opciones.peligro && !this.opciones.pedirPassword ? '' : null;

  protected cancelar(): void {
    this.dialogRef.close(false);
  }

  protected confirmar(evento: Event): void {
    // Sin [formGroup] no hay ngSubmit: se usa el submit nativo y se evita que recargue la página.
    evento.preventDefault();
    if (!this.opciones.pedirPassword) {
      this.dialogRef.close(true);
      return;
    }
    if (this.password.invalid) {
      this.password.markAsTouched();
      return;
    }
    this.dialogRef.close(this.password.value);
  }
}
