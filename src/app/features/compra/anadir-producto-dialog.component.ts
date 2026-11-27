import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { ListaCompraResponse, UnidadCompra } from '@core/models';
import { ETIQUETAS_UNIDAD_COMPRA } from '@core/models/etiquetas';
import { ListasCompraService } from '@core/services/listas-compra.service';
import { aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsQuantityInputComponent } from '@shared/ui/form/quantity-input.component';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { MAX_CANTIDAD, MAX_NOMBRE_PRODUCTO, MAX_SECCION, SECCION_POR_DEFECTO, UNIDADES_COMPRA } from './compra';

export interface AnadirProductoData {
  listaId: string;
  /** Secciones que ya tiene la lista, para proponerlas al escribir. */
  secciones: string[];
}

type Campo = 'nombre' | 'cantidad' | 'unidad' | 'seccion';

/**
 * Producto escrito a mano (docs/api/compra.md §6): nombre, cantidad, unidad y sección opcional
 * ("Otros" si se deja vacía) → POST /listas-compra/{id}/productos. Se cierra con la lista completa.
 */
@Component({
  selector: 'app-anadir-producto-dialog',
  imports: [
    DialogShellComponent,
    FormsModule,
    NsAlertComponent,
    NsButtonComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsQuantityInputComponent,
    NsSelectComponent,
  ],
  template: `
    <ns-dialog-shell>
      <form id="ns-anadir-producto-form" class="formulario" (ngSubmit)="guardar()" novalidate>
        <ns-form-field label="Producto" obligatorio>
          <input
            nsInput
            type="text"
            name="nombre"
            autocomplete="off"
            placeholder="Servilletas"
            [maxlength]="maxNombre"
            [ngModel]="nombre()"
            (ngModelChange)="nombre.set($event); limpiar('nombre')"
            [invalido]="!!errores().nombre"
            descritoPor="ns-anadir-producto-error-nombre"
          />
        </ns-form-field>
        <p class="error" id="ns-anadir-producto-error-nombre" [hidden]="!errores().nombre">{{ errores().nombre }}</p>

        <div class="fila">
          <ns-form-field label="Cantidad" obligatorio>
            <ns-quantity-input
              name="cantidad"
              [min]="0.01"
              [max]="maxCantidad"
              [decimales]="2"
              [ngModel]="cantidad()"
              (ngModelChange)="cantidad.set($event); limpiar('cantidad')"
            />
          </ns-form-field>
          <ns-form-field label="Unidad" obligatorio>
            <ns-select
              name="unidad"
              [opciones]="unidades"
              [ngModel]="unidad()"
              (ngModelChange)="unidad.set($event); limpiar('unidad')"
            />
          </ns-form-field>
        </div>
        <p class="error" [hidden]="!errores().cantidad && !errores().unidad">
          {{ errores().cantidad ?? errores().unidad }}
        </p>

        <ns-form-field label="Sección" [hint]="'Opcional. Si la dejas vacía: «' + seccionPorDefecto + '».'">
          <input
            nsInput
            type="text"
            name="seccion"
            autocomplete="off"
            list="ns-anadir-producto-secciones"
            [maxlength]="maxSeccion"
            [ngModel]="seccion()"
            (ngModelChange)="seccion.set($event); limpiar('seccion')"
            [invalido]="!!errores().seccion"
          />
        </ns-form-field>
        <datalist id="ns-anadir-producto-secciones">
          @for (s of data.secciones; track s) {
            <option [value]="s"></option>
          }
        </datalist>
        <p class="error" [hidden]="!errores().seccion">{{ errores().seccion }}</p>

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
      <button
        nsDialogAcciones
        nsButton
        type="submit"
        form="ns-anadir-producto-form"
        icon="plus"
        [loading]="guardando()"
      >
        Añadir
      </button>
    </ns-dialog-shell>
  `,
  styles: `
    .formulario {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .fila {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 120px;
      gap: var(--ns-space-3);
    }
    .error {
      margin: calc(-1 * var(--ns-space-3)) 0 0;
      color: var(--ns-error);
      font-size: 0.8125rem;

      &[hidden] {
        display: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnadirProductoDialogComponent {
  protected readonly ref = inject<DialogRef<ListaCompraResponse>>(DialogRef);
  private readonly listasService = inject(ListasCompraService);
  protected readonly data = inject<AnadirProductoData>(DIALOG_DATA);

  protected readonly maxNombre = MAX_NOMBRE_PRODUCTO;
  protected readonly maxSeccion = MAX_SECCION;
  protected readonly maxCantidad = MAX_CANTIDAD;
  protected readonly seccionPorDefecto = SECCION_POR_DEFECTO;
  protected readonly unidades: NsOpcion<UnidadCompra>[] = UNIDADES_COMPRA.map((u) => ({
    valor: u,
    etiqueta: ETIQUETAS_UNIDAD_COMPRA[u],
  }));

  protected readonly nombre = signal('');
  protected readonly cantidad = signal<number | null>(1);
  protected readonly unidad = signal<UnidadCompra | null>('UD');
  protected readonly seccion = signal('');
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errores = signal<Partial<Record<Campo, string>>>({});

  protected limpiar(campo: Campo): void {
    if (this.errores()[campo]) this.errores.update((e) => ({ ...e, [campo]: undefined }));
  }

  protected guardar(): void {
    if (this.guardando()) return;
    const nombre = this.nombre().trim();
    const cantidad = this.cantidad();
    const unidad = this.unidad();
    const seccion = this.seccion().trim();

    const errores: Partial<Record<Campo, string>> = {};
    if (!nombre) errores.nombre = 'Escribe el nombre del producto.';
    if (cantidad === null || !(cantidad > 0)) errores.cantidad = 'La cantidad debe ser mayor que 0.';
    else if (cantidad > MAX_CANTIDAD) errores.cantidad = 'La cantidad no puede pasar de 99.999,99.';
    if (!unidad) errores.unidad = 'Elige la unidad.';
    this.errores.set(errores);
    if (Object.keys(errores).length > 0 || cantidad === null || !unidad) return;

    this.guardando.set(true);
    this.error.set(null);
    this.listasService
      .anadirProducto(this.data.listaId, {
        nombre: nombre.slice(0, MAX_NOMBRE_PRODUCTO),
        cantidad,
        unidad,
        ...(seccion ? { seccion: seccion.slice(0, MAX_SECCION) } : {}),
      })
      .subscribe({
        next: (lista) => this.ref.close(lista),
        error: (e: unknown) => {
          const error = aApiError(e);
          const deCampos: Partial<Record<Campo, string>> = {};
          for (const c of error.errores) {
            if (c.campo === 'nombre' || c.campo === 'cantidad' || c.campo === 'unidad' || c.campo === 'seccion')
              deCampos[c.campo] = c.mensaje;
          }
          if (Object.keys(deCampos).length > 0) this.errores.set(deCampos);
          else this.error.set(error.detalle);
          this.guardando.set(false);
        },
      });
  }
}
