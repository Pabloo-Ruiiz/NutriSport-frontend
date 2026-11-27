import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { ListaCompraResponse, MenuResponse } from '@core/models';
import { ListasCompraService } from '@core/services/listas-compra.service';
import { aApiError } from '@core/util/api-error';
import { hoyLocal } from '@core/util/fechas';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSegmentedComponent } from '@shared/ui/form/segmented.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { etiquetaRango, rangoSugerido } from './compra';

export interface GenerarListaData {
  menu: Pick<MenuResponse, 'id' | 'nombre' | 'fechaInicio' | 'fechaFin'>;
}

type Alcance = 'todo' | 'rango';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Generar la lista de la compra de un menú (docs/api/compra.md §6): todo el menú o un rango de días
 * dentro de él → POST /listas-compra/desde-menu/{menuId}. Se cierra con la lista creada (quien lo
 * abre la muestra); sin valor si se cancela.
 */
@Component({
  selector: 'app-generar-lista-dialog',
  imports: [
    DialogShellComponent,
    FormsModule,
    NsAlertComponent,
    NsButtonComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsSegmentedComponent,
  ],
  template: `
    <ns-dialog-shell>
      <form id="ns-gen-lista-form" class="ns-gen-lista" (ngSubmit)="generar()" novalidate>
        <p class="ns-gen-lista__intro">
          Sumamos los ingredientes de las comidas aún no consumidas de «{{ menu.nombre }}» y los agrupamos por sección
          del supermercado.
        </p>

        <ns-form-field label="Qué días">
          <ns-segmented
            name="alcance"
            [opciones]="alcances"
            [ngModel]="alcance()"
            (ngModelChange)="cambiarAlcance($event)"
          />
        </ns-form-field>

        @if (alcance() === 'rango') {
          <div class="ns-gen-lista__fechas">
            <ns-form-field label="Desde" obligatorio>
              <input
                nsInput
                type="date"
                name="desde"
                [min]="menu.fechaInicio"
                [max]="menu.fechaFin"
                [ngModel]="desde()"
                (ngModelChange)="cambiarDesde($event)"
                [invalido]="!!errorFechas()"
                descritoPor="ns-gen-lista-error"
              />
            </ns-form-field>
            <ns-form-field label="Hasta" obligatorio>
              <input
                nsInput
                type="date"
                name="hasta"
                [min]="desde() || menu.fechaInicio"
                [max]="menu.fechaFin"
                [ngModel]="hasta()"
                (ngModelChange)="cambiarHasta($event)"
                [invalido]="!!errorFechas()"
                descritoPor="ns-gen-lista-error"
              />
            </ns-form-field>
          </div>
          <p class="ns-gen-lista__error" id="ns-gen-lista-error" [hidden]="!errorFechas()">{{ errorFechas() }}</p>
        } @else {
          <p class="ns-gen-lista__rango">Del menú completo: {{ rangoMenu }}.</p>
        }

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
        form="ns-gen-lista-form"
        icon="shopping-basket"
        [loading]="guardando()"
      >
        Generar lista
      </button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-gen-lista {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-gen-lista__intro,
    .ns-gen-lista__rango {
      margin: 0;
      color: var(--ns-text-secondary);
      font-size: 0.875rem;
    }
    .ns-gen-lista__fechas {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: var(--ns-space-3);
    }
    .ns-gen-lista__error {
      margin: calc(-1 * var(--ns-space-3)) 0 0;
      color: var(--ns-error);
      font-size: 0.8125rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerarListaDialogComponent {
  protected readonly ref = inject<DialogRef<ListaCompraResponse>>(DialogRef);
  private readonly listasService = inject(ListasCompraService);
  protected readonly menu = inject<GenerarListaData>(DIALOG_DATA).menu;

  protected readonly alcances: NsOpcion<Alcance>[] = [
    { valor: 'todo', etiqueta: 'Todo el menú' },
    { valor: 'rango', etiqueta: 'Elegir días' },
  ];
  protected readonly rangoMenu = etiquetaRango(this.menu.fechaInicio, this.menu.fechaFin);
  private readonly sugerido = rangoSugerido(this.menu.fechaInicio, this.menu.fechaFin, hoyLocal());

  protected readonly alcance = signal<Alcance>('todo');
  protected readonly desde = signal(this.sugerido.desde);
  protected readonly hasta = signal(this.sugerido.hasta);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorServidor = signal<string | null>(null);

  /** Validación local del rango (§6: desde y hasta deben estar dentro del menú) o el error del servidor. */
  protected readonly errorFechas = computed<string | null>(() => {
    if (this.alcance() !== 'rango') return null;
    const local = this.validarRango(this.desde(), this.hasta());
    return local ?? this.errorServidor();
  });
  private readonly intentado = signal(false);

  protected cambiarAlcance(alcance: Alcance | null): void {
    if (alcance) this.alcance.set(alcance);
    this.limpiarErrores();
  }

  protected cambiarDesde(fecha: string): void {
    this.desde.set(fecha);
    this.limpiarErrores();
  }

  protected cambiarHasta(fecha: string): void {
    this.hasta.set(fecha);
    this.limpiarErrores();
  }

  protected generar(): void {
    if (this.guardando()) return;
    this.intentado.set(true);
    const rango = this.alcance() === 'rango';
    if (rango && this.validarRango(this.desde(), this.hasta())) return;

    this.guardando.set(true);
    this.error.set(null);
    this.listasService
      .generarDesdeMenu(this.menu.id, rango ? { desde: this.desde(), hasta: this.hasta() } : {})
      .subscribe({
        next: (lista) => this.ref.close(lista),
        error: (e: unknown) => {
          const error = aApiError(e);
          const deFechas = error.errores.find((c) => c.campo === 'desde' || c.campo === 'hasta');
          if (rango && deFechas) this.errorServidor.set(deFechas.mensaje);
          else this.error.set(error.detalle);
          this.guardando.set(false);
        },
      });
  }

  private limpiarErrores(): void {
    this.errorServidor.set(null);
    this.error.set(null);
  }

  /** Mensaje del primer problema del rango, o null si es válido. Solo tras el primer intento. */
  private validarRango(desde: string, hasta: string): string | null {
    if (!this.intentado()) return null;
    if (!FECHA.test(desde) || !FECHA.test(hasta)) return 'Indica el primer y el último día.';
    if (desde < this.menu.fechaInicio || hasta > this.menu.fechaFin)
      return `Elige días dentro del menú (${this.rangoMenu}).`;
    if (desde > hasta) return 'El primer día no puede ser posterior al último.';
    return null;
  }
}
