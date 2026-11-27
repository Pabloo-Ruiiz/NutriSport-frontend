import { ChangeDetectionStrategy, Component, inject, input, numberAttribute } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { ComidaEditorStore } from './comida-editor.store';
import { LineaAlimentoComponent } from './linea-alimento.component';
import { TotalesComidaComponent } from './totales-comida.component';

/** Máximo de caracteres de las notas (RegistroComidaRequest.notas). */
export const MAX_NOTAS = 500;

/**
 * "Tu comida" (DESIGN.md §7.6): líneas, totales y notas, sobre ComidaEditorStore. Se usa en la
 * columna derecha del registro y en el bottom sheet de móvil (con el inyector del registro, para
 * compartir el mismo store).
 */
@Component({
  selector: 'app-comida-en-construccion',
  imports: [
    FormsModule,
    NsAlertComponent,
    NsEmptyStateComponent,
    NsFormFieldComponent,
    NsInputDirective,
    LineaAlimentoComponent,
    TotalesComidaComponent,
  ],
  template: `
    @if (editor.noEditables().length) {
      <ns-alert type="info">
        No se pueden editar aquí: {{ editor.noEditables().join(', ') }}. Si guardas, se quitarán de la comida.
      </ns-alert>
    }

    @if (editor.vacia()) {
      <ns-empty-state
        icon="search"
        titulo="Busca un alimento para empezar"
        descripcion="Añade lo que has comido y ajusta las cantidades."
        [nivelTitulo]="nivelTitulo() + 1"
      />
    } @else {
      <ul class="ns-cec__lineas" role="list" aria-label="Alimentos de la comida">
        @for (linea of editor.lineas(); track linea.alimento.id ?? linea.codigoBarras; let i = $index) {
          <li>
            <app-linea-alimento
              [linea]="linea"
              [error]="errorDe(i)"
              (cantidad)="editor.cambiarCantidad(i, $event)"
              (unidad)="editor.cambiarUnidad(i, $event)"
              (quitar)="editor.quitar(i)"
            />
          </li>
        }
      </ul>
      <app-totales-comida class="ns-cec__totales" [totales]="editor.estimacion()" />
    }

    <ns-form-field label="Notas" [hint]="'Opcional. ' + editor.notas().length + ' de ' + maxNotas + ' caracteres.'">
      <textarea
        nsInput
        rows="2"
        [maxlength]="maxNotas"
        [ngModel]="editor.notas()"
        (ngModelChange)="editor.cambiarNotas($event)"
        placeholder="p. ej. con aceite de oliva, sin sal"
      ></textarea>
    </ns-form-field>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-cec__lineas {
      margin: 0;
      padding: 0;
      list-style: none;
      li + li {
        border-top: 1px solid var(--ns-border);
      }
    }
    .ns-cec__totales {
      padding-top: var(--ns-space-4);
      border-top: 2px solid var(--ns-border-strong);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComidaEnConstruccionComponent {
  readonly nivelTitulo = input(2, { transform: numberAttribute });

  protected readonly editor = inject(ComidaEditorStore);
  protected readonly maxNotas = MAX_NOTAS;

  protected errorDe(indice: number): string | null {
    if (this.editor.lineasSinCantidad().includes(indice)) return 'Indica una cantidad mayor que 0.';
    return this.editor.erroresLineas().get(indice) ?? null;
  }
}
