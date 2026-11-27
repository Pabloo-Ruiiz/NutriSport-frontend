import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import type { ProductoCompraResponse, SeccionCompraResponse } from '@core/models';
import { type EdicionProducto, ProductoCompraItemComponent } from './producto-compra-item.component';

let siguienteId = 0;

/**
 * Sección del supermercado (DESIGN.md §7.12): cabecera colapsable con el nombre y el contador de
 * pendientes, y sus productos. Reenvía los eventos de los productos.
 */
@Component({
  selector: 'app-seccion-compra',
  imports: [LucideDynamicIcon, ProductoCompraItemComponent],
  template: `
    <h2 class="cabecera">
      <button
        type="button"
        class="cabecera__boton"
        [attr.aria-expanded]="abierta()"
        [attr.aria-controls]="idLista"
        (click)="abierta.set(!abierta())"
      >
        <span class="cabecera__nombre">{{ seccion().nombre }}</span>
        <span class="contador ns-tnum" [class.contador--hecho]="pendientes() === 0">
          {{
            pendientes() === 0 ? 'Todo comprado' : pendientes() + (pendientes() === 1 ? ' pendiente' : ' pendientes')
          }}
        </span>
        <svg lucideIcon="chevron-down" [size]="20" [class.girado]="!abierta()" aria-hidden="true"></svg>
      </button>
    </h2>
    <div class="productos" [id]="idLista" [hidden]="!abierta()" role="list">
      @for (p of seccion().productos; track p.id) {
        <app-producto-compra-item
          role="listitem"
          [producto]="p"
          [ocupado]="ocupados().has(p.id)"
          (marcar)="marcar.emit($event)"
          (editar)="editar.emit($event)"
          (quitar)="quitar.emit($event)"
        />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      border: 1px solid var(--ns-border);
      border-radius: var(--ns-radius-lg);
      background: var(--ns-surface);
    }
    .cabecera {
      margin: 0;
    }
    .cabecera__boton {
      display: flex;
      align-items: center;
      gap: var(--ns-space-2);
      width: 100%;
      min-height: 56px;
      padding: 0 var(--ns-space-4);
      border: 0;
      border-radius: var(--ns-radius-lg);
      background: transparent;
      color: var(--ns-text);
      font: 600 1rem/1.5rem var(--ns-font-body);
      text-align: left;
      cursor: pointer;

      &:hover {
        background: var(--ns-surface-muted);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: -2px;
      }
    }
    .cabecera__nombre {
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .contador {
      padding: 2px var(--ns-space-2);
      border-radius: var(--ns-radius-full);
      background: var(--ns-surface-sunken);
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .contador--hecho {
      background: var(--ns-success-bg);
      color: var(--ns-success);
    }
    .girado {
      transform: rotate(-90deg);
    }
    .productos {
      padding: 0 var(--ns-space-4);
      border-top: 1px solid var(--ns-border);

      &[hidden] {
        display: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeccionCompraComponent {
  readonly seccion = input.required<SeccionCompraResponse>();
  /** Ids de los productos con una operación en curso. */
  readonly ocupados = input<ReadonlySet<string>>(new Set());

  readonly marcar = output<{ producto: ProductoCompraResponse; comprado: boolean }>();
  readonly editar = output<EdicionProducto>();
  readonly quitar = output<ProductoCompraResponse>();

  protected readonly idLista = `ns-seccion-${++siguienteId}`;
  protected readonly abierta = signal(true);
  protected readonly pendientes = computed(() => this.seccion().productos.filter((p) => !p.comprado).length);
}
