import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { ACCIONES_REGISTRO } from './navegacion';

/**
 * Bottom sheet del botón central de la barra inferior (DESIGN.md §6.4): formas de registrar una
 * comida. Se abre con NsDialogService, que en móvil lo presenta como sheet.
 */
@Component({
  selector: 'ns-registrar-sheet',
  imports: [RouterLink, LucideDynamicIcon, DialogShellComponent],
  template: `
    <ns-dialog-shell>
      <ul class="ns-registrar" role="list">
        @for (accion of acciones; track accion.ruta) {
          <li>
            <a class="ns-registrar__opcion" [routerLink]="accion.ruta" (click)="ref.close()">
              <span class="ns-registrar__icono" aria-hidden="true">
                <svg [lucideIcon]="accion.icono" [size]="20"></svg>
              </span>
              <span class="ns-registrar__textos">
                <span class="ns-registrar__etiqueta">{{ accion.etiqueta }}</span>
                <span class="ns-registrar__descripcion">{{ accion.descripcion }}</span>
              </span>
              <svg class="ns-registrar__flecha" lucideIcon="chevron-right" [size]="18" aria-hidden="true"></svg>
            </a>
          </li>
        }
      </ul>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-registrar {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-registrar__opcion {
      display: flex;
      align-items: center;
      gap: var(--ns-space-3);
      min-height: 64px;
      padding: var(--ns-space-3);
      border: 1px solid var(--ns-border);
      border-radius: var(--ns-radius-lg);
      color: var(--ns-text);
      text-decoration: none;

      &:hover {
        background: var(--ns-surface-muted);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
    }
    .ns-registrar__icono {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--ns-radius-md);
      background: var(--ns-data-kcal-bg);
      color: var(--ns-action-primary);
    }
    .ns-registrar__textos {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-width: 0;
    }
    .ns-registrar__etiqueta {
      font-weight: 600;
    }
    .ns-registrar__descripcion {
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
    }
    .ns-registrar__flecha {
      flex-shrink: 0;
      color: var(--ns-text-tertiary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarSheetComponent {
  protected readonly ref = inject(DialogRef);
  protected readonly acciones = ACCIONES_REGISTRO;
}
