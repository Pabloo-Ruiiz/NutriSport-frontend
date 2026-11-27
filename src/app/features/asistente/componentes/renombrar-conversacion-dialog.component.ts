import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { ConversacionResponse, ConversacionResumenResponse } from '@core/models';
import { AsistenteService, MAX_CARACTERES_TITULO } from '@core/services/asistente.service';
import { aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';

export interface RenombrarConversacionData {
  conversacion: Pick<ConversacionResumenResponse, 'id' | 'titulo'>;
}

/**
 * Renombrar una conversación → PATCH /asistente/conversaciones/{id} { titulo } (máx. 100 caracteres,
 * no solo espacios). Se cierra con la conversación actualizada.
 */
@Component({
  selector: 'app-renombrar-conversacion-dialog',
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
      <form id="ns-renombrar-conv-form" class="ns-renombrar-conv" (ngSubmit)="guardar()" novalidate>
        <ns-form-field label="Título" obligatorio [hint]="titulo().length + ' / ' + max">
          <input
            nsInput
            type="text"
            name="titulo"
            autocomplete="off"
            [maxlength]="max"
            [ngModel]="titulo()"
            (ngModelChange)="cambiar($event)"
            [invalido]="!!errorTitulo()"
            descritoPor="ns-renombrar-conv-error"
          />
        </ns-form-field>
        <p class="ns-renombrar-conv__error" id="ns-renombrar-conv-error" [hidden]="!errorTitulo()">
          {{ errorTitulo() }}
        </p>
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
      <button nsDialogAcciones nsButton type="submit" form="ns-renombrar-conv-form" [loading]="guardando()">
        Guardar
      </button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-renombrar-conv {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-renombrar-conv__error {
      margin: calc(-1 * var(--ns-space-3)) 0 0;
      color: var(--ns-error);
      font-size: 0.8125rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenombrarConversacionDialogComponent {
  protected readonly ref = inject<DialogRef<ConversacionResponse>>(DialogRef);
  private readonly asistente = inject(AsistenteService);
  private readonly conversacion = inject<RenombrarConversacionData>(DIALOG_DATA).conversacion;

  protected readonly max = MAX_CARACTERES_TITULO;
  protected readonly titulo = signal(this.conversacion.titulo ?? '');
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorTitulo = signal<string | null>(null);

  protected cambiar(titulo: string): void {
    this.titulo.set(titulo);
    this.errorTitulo.set(null);
  }

  protected guardar(): void {
    if (this.guardando()) return;
    const titulo = this.titulo().trim();
    if (!titulo) {
      this.errorTitulo.set('Escribe un título.');
      return;
    }
    if (titulo === this.conversacion.titulo) {
      this.ref.close();
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    this.asistente.actualizar(this.conversacion.id, { titulo: titulo.slice(0, MAX_CARACTERES_TITULO) }).subscribe({
      next: (c) => this.ref.close(c),
      error: (e: unknown) => {
        const error = aApiError(e);
        const deTitulo = error.errores.find((c) => c.campo === 'titulo');
        if (deTitulo) this.errorTitulo.set(deTitulo.mensaje);
        else this.error.set(error.detalle);
        this.guardando.set(false);
      },
    });
  }
}
