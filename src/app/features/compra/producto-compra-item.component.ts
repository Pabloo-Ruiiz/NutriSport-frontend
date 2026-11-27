import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import type { ActualizarProductoRequest, ProductoCompraResponse, UnidadCompra } from '@core/models';
import { ETIQUETAS_UNIDAD_COMPRA } from '@core/models/etiquetas';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsQuantityInputComponent } from '@shared/ui/form/quantity-input.component';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { MAX_CANTIDAD, UNIDADES_COMPRA, cantidadTexto, desgloseTexto } from './compra';

/** Cambio de cantidad y unidad pedido desde la edición en línea. */
export interface EdicionProducto {
  producto: ProductoCompraResponse;
  cambios: Pick<ActualizarProductoRequest, 'cantidad' | 'unidad'>;
}

let siguienteId = 0;

/**
 * Producto de la lista (DESIGN.md §7.12): casilla de 24 px, nombre, cantidad total con su unidad,
 * badge "Manual", desglose por día al expandir y edición en línea de cantidad y unidad. Fila de
 * 56 px como mínimo (uso en el supermercado). Solo emite: la lista la actualiza quien lo usa.
 */
@Component({
  selector: 'app-producto-compra-item',
  imports: [
    FormsModule,
    LucideDynamicIcon,
    NsBadgeComponent,
    NsButtonComponent,
    NsQuantityInputComponent,
    NsSelectComponent,
  ],
  template: `
    <div class="fila">
      <label class="casilla">
        <input
          type="checkbox"
          class="casilla__nativo"
          [checked]="producto().comprado"
          [disabled]="ocupado()"
          (change)="alternar($event)"
        />
        <svg class="casilla__check" lucideIcon="check" [size]="16" [strokeWidth]="3" aria-hidden="true"></svg>
        <span class="ns-sr-only">{{ producto().comprado ? 'Comprado: ' : 'Marcar como comprado: ' }}</span>
        <span class="info">
          <span class="nombre">{{ producto().nombre }}</span>
          <span class="cantidad ns-tnum">{{ cantidad() }}</span>
        </span>
      </label>

      @if (producto().manual) {
        <ns-badge class="manual">Manual</ns-badge>
      }

      <div class="acciones">
        @if (producto().desglose.length > 0) {
          <button
            type="button"
            class="icono"
            [attr.aria-expanded]="expandido()"
            [attr.aria-controls]="idDesglose"
            [attr.aria-label]="(expandido() ? 'Ocultar' : 'Ver') + ' el desglose por día de ' + producto().nombre"
            (click)="expandido.set(!expandido())"
          >
            <svg lucideIcon="chevron-down" [size]="20" [class.girado]="expandido()" aria-hidden="true"></svg>
          </button>
        }
        <button
          type="button"
          class="icono"
          [attr.aria-label]="'Editar cantidad de ' + producto().nombre"
          [attr.aria-expanded]="editando()"
          [disabled]="ocupado()"
          (click)="abrirEdicion()"
        >
          <svg lucideIcon="pencil" [size]="18" aria-hidden="true"></svg>
        </button>
        <button
          type="button"
          class="icono icono--peligro"
          [attr.aria-label]="'Quitar ' + producto().nombre"
          [disabled]="ocupado()"
          (click)="quitar.emit(producto())"
        >
          <svg lucideIcon="trash" [size]="18" aria-hidden="true"></svg>
        </button>
      </div>
    </div>

    @if (expandido() && producto().desglose.length > 0) {
      <p class="desglose ns-text-body-sm ns-text-secondary" [id]="idDesglose">{{ desglose() }}</p>
    }

    @if (editando()) {
      <form class="edicion" (ngSubmit)="guardar()" novalidate>
        <ns-quantity-input
          name="cantidad"
          etiqueta="Cantidad"
          [min]="0.01"
          [max]="maxCantidad"
          [decimales]="2"
          [ngModel]="cantidadEditada()"
          (ngModelChange)="cantidadEditada.set($event)"
        />
        <ns-select
          name="unidad"
          etiqueta="Unidad"
          [opciones]="unidades"
          [ngModel]="unidadEditada()"
          (ngModelChange)="unidadEditada.set($event)"
        />
        <div class="edicion__botones">
          <button nsButton type="button" variant="secondary" size="sm" (click)="editando.set(false)">Cancelar</button>
          <button nsButton type="submit" size="sm" [disabled]="!edicionValida()">Guardar</button>
        </div>
      </form>
    }
  `,
  styles: `
    :host {
      display: block;
      border-bottom: 1px solid var(--ns-border);
    }
    :host(:last-child) {
      border-bottom: 0;
    }
    .fila {
      display: flex;
      align-items: center;
      gap: var(--ns-space-2);
      min-height: 56px;
      padding: var(--ns-space-1) 0;
    }
    .casilla {
      position: relative;
      display: flex;
      flex: 1;
      align-items: center;
      gap: var(--ns-space-3);
      min-width: 0;
      min-height: 48px;
      cursor: pointer;
    }
    .casilla__nativo {
      flex-shrink: 0;
      appearance: none;
      width: 24px;
      height: 24px;
      margin: 0;
      border: 2px solid var(--ns-border-input);
      border-radius: var(--ns-radius-sm);
      background: var(--ns-surface);
      cursor: inherit;
      transition:
        background-color var(--ns-duration-fast) var(--ns-ease-out),
        border-color var(--ns-duration-fast) var(--ns-ease-out);

      &:checked {
        border-color: var(--ns-action-primary);
        background: var(--ns-action-primary);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
    }
    .casilla__check {
      position: absolute;
      left: 4px;
      color: var(--ns-text-inverse);
      pointer-events: none;
      opacity: 0;
    }
    .casilla__nativo:checked ~ .casilla__check {
      opacity: 1;
    }
    .info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .nombre {
      color: var(--ns-text);
      font-weight: 500;
      overflow-wrap: anywhere;
    }
    .cantidad {
      color: var(--ns-text-secondary);
      font-size: 0.875rem;
    }
    :host(.comprado) .nombre {
      color: var(--ns-text-tertiary);
      text-decoration: line-through;
    }
    .manual {
      flex-shrink: 0;
    }
    .acciones {
      display: flex;
      flex-shrink: 0;
    }
    .icono {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border: 0;
      border-radius: var(--ns-radius-md);
      background: transparent;
      color: var(--ns-text-secondary);
      cursor: pointer;

      &:hover:not(:disabled) {
        background: var(--ns-surface-muted);
        color: var(--ns-text);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
      &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
    }
    .icono--peligro:hover:not(:disabled) {
      color: var(--ns-error);
    }
    .girado {
      transform: rotate(180deg);
    }
    .desglose {
      margin: 0 0 var(--ns-space-3) calc(24px + var(--ns-space-3));
    }
    .edicion {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--ns-space-2);
      margin: 0 0 var(--ns-space-3) calc(24px + var(--ns-space-3));

      ns-quantity-input {
        width: 180px;
      }
      ns-select {
        width: 110px;
      }
    }
    .edicion__botones {
      display: flex;
      gap: var(--ns-space-2);
    }
  `,
  host: { '[class.comprado]': 'producto().comprado' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductoCompraItemComponent {
  readonly producto = input.required<ProductoCompraResponse>();
  /** Una operación de este producto en curso (editar o quitar). */
  readonly ocupado = input(false, { transform: booleanAttribute });

  readonly marcar = output<{ producto: ProductoCompraResponse; comprado: boolean }>();
  readonly editar = output<EdicionProducto>();
  readonly quitar = output<ProductoCompraResponse>();

  protected readonly idDesglose = `ns-desglose-${++siguienteId}`;
  protected readonly maxCantidad = MAX_CANTIDAD;
  protected readonly unidades: NsOpcion<UnidadCompra>[] = UNIDADES_COMPRA.map((u) => ({
    valor: u,
    etiqueta: ETIQUETAS_UNIDAD_COMPRA[u],
  }));

  protected readonly cantidad = computed(() => cantidadTexto(this.producto().cantidad, this.producto().unidad));
  protected readonly desglose = computed(() => desgloseTexto(this.producto().desglose, this.producto().unidad));

  protected readonly expandido = signal(false);
  protected readonly editando = signal(false);
  protected readonly cantidadEditada = signal<number | null>(null);
  protected readonly unidadEditada = signal<UnidadCompra>('UD');
  protected readonly edicionValida = computed(() => {
    const c = this.cantidadEditada();
    return c !== null && c > 0 && c <= MAX_CANTIDAD;
  });

  protected alternar(evento: Event): void {
    const casilla = evento.target as HTMLInputElement;
    const comprado = casilla.checked;
    // La casilla refleja siempre el estado de la lista: el cambio llega por el input (optimista) y,
    // si el PATCH falla y se revierte, vuelve a su valor aunque el binding no haya cambiado.
    casilla.checked = this.producto().comprado;
    this.marcar.emit({ producto: this.producto(), comprado });
  }

  protected abrirEdicion(): void {
    if (this.editando()) {
      this.editando.set(false);
      return;
    }
    this.cantidadEditada.set(this.producto().cantidad);
    this.unidadEditada.set(this.producto().unidad);
    this.editando.set(true);
  }

  protected guardar(): void {
    const cantidad = this.cantidadEditada();
    if (!this.edicionValida() || cantidad === null) return;
    this.editando.set(false);
    const p = this.producto();
    if (cantidad === p.cantidad && this.unidadEditada() === p.unidad) return;
    this.editar.emit({ producto: p, cambios: { cantidad, unidad: this.unidadEditada() } });
  }
}
