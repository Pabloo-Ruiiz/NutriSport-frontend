import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, map } from 'rxjs';

import type { ListaCompraResponse, ListaCompraResumenResponse, MenuResponse, RecetaResponse } from '@core/models';
import { ListasCompraService } from '@core/services/listas-compra.service';
import { aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsQuantityInputComponent } from '@shared/ui/form/quantity-input.component';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { MAX_RACIONES, etiquetaRango } from './compra';

export interface AnadirRecetaListaData {
  receta: Pick<RecetaResponse, 'id' | 'nombre'>;
  /** Raciones propuestas (las de la comida planificada o las elegidas en el detalle). */
  raciones: number;
  /** Desde el planificador: permite crear una lista nueva a partir de este menú. */
  menu?: Pick<MenuResponse, 'id' | 'nombre' | 'fechaInicio' | 'fechaFin'> | null;
}

export interface AnadirRecetaListaResultado {
  lista: ListaCompraResponse;
  /** true si se ha creado una lista nueva desde el menú (ya incluye la receta planificada). */
  nueva: boolean;
}

/** Valor de la opción "Nueva lista del menú" en el selector. */
const NUEVA = '__nueva__';
/** Listas que se ofrecen (la API da como mucho 50 por página). */
const MAX_LISTAS = 50;

/**
 * Añadir los ingredientes de una receta a una lista (docs/api/compra.md §6): se elige una lista
 * activa y las raciones → POST /listas-compra/{id}/productos/desde-receta.
 *
 * Desde el planificador también se puede crear una lista nueva con el menú completo
 * (POST /listas-compra/desde-menu/{menuId}); como el menú ya incluye la comida, no se vuelve a
 * añadir la receta. Se cierra con la lista resultante; sin valor si se cancela.
 */
@Component({
  selector: 'app-anadir-receta-lista-dialog',
  imports: [
    DialogShellComponent,
    FormsModule,
    NsAlertComponent,
    NsButtonComponent,
    NsFormFieldComponent,
    NsQuantityInputComponent,
    NsSelectComponent,
    NsSkeletonComponent,
  ],
  template: `
    <ns-dialog-shell>
      <form id="ns-receta-lista-form" class="formulario" (ngSubmit)="guardar()" novalidate>
        <p class="intro">Ingredientes de «{{ data.receta.nombre }}», escalados a las raciones que elijas.</p>

        @if (cargando()) {
          <ns-skeleton shape="rect" height="64px" />
        } @else if (errorCarga(); as error) {
          <ns-alert type="error" titulo="No hemos podido cargar tus listas">
            {{ error }}
            <button nsAlertAcciones nsButton type="button" variant="secondary" size="sm" (click)="cargar()">
              Reintentar
            </button>
          </ns-alert>
        } @else if (opciones().length === 0) {
          <ns-alert type="info" titulo="No tienes listas activas">
            Genera una lista desde un menú del planificador y vuelve a intentarlo.
            <button nsAlertAcciones nsButton type="button" variant="secondary" size="sm" (click)="irAlPlanificador()">
              Ir al planificador
            </button>
          </ns-alert>
        } @else {
          <ns-form-field label="Lista" obligatorio>
            <ns-select name="lista" [opciones]="opciones()" [ngModel]="destino()" (ngModelChange)="elegir($event)" />
          </ns-form-field>

          @if (esNueva()) {
            <p class="nota">
              La lista nueva incluye los ingredientes de todo el menú, así que esta comida ya estará en ella.
            </p>
          } @else {
            <ns-form-field label="Raciones" obligatorio>
              <ns-quantity-input
                name="raciones"
                [min]="0.5"
                [max]="maxRaciones"
                [step]="1"
                [decimales]="1"
                [ngModel]="raciones()"
                (ngModelChange)="raciones.set($event); errorRaciones.set(null)"
              />
            </ns-form-field>
            <p class="error" [hidden]="!errorRaciones()">{{ errorRaciones() }}</p>
          }
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
        form="ns-receta-lista-form"
        icon="shopping-basket"
        [disabled]="!destino()"
        [loading]="guardando()"
      >
        {{ esNueva() ? 'Crear lista' : 'Añadir a la lista' }}
      </button>
    </ns-dialog-shell>
  `,
  styles: `
    .formulario {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .intro,
    .nota {
      margin: 0;
      color: var(--ns-text-secondary);
      font-size: 0.875rem;
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
export class AnadirRecetaListaDialogComponent {
  protected readonly ref = inject<DialogRef<AnadirRecetaListaResultado>>(DialogRef);
  private readonly listasService = inject(ListasCompraService);
  private readonly router = inject(Router);
  protected readonly data = inject<AnadirRecetaListaData>(DIALOG_DATA);

  protected readonly maxRaciones = MAX_RACIONES;

  protected readonly listas = signal<ListaCompraResumenResponse[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);

  protected readonly destino = signal<string | null>(null);
  protected readonly raciones = signal<number | null>(this.data.raciones);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorRaciones = signal<string | null>(null);

  protected readonly esNueva = computed(() => this.destino() === NUEVA);
  protected readonly opciones = computed<NsOpcion<string>[]>(() => {
    const opciones: NsOpcion<string>[] = this.listas().map((l) => {
      const rango = etiquetaRango(l.fechaDesde, l.fechaHasta);
      return { valor: l.id, etiqueta: rango ? `${l.nombre} · ${rango}` : l.nombre };
    });
    const menu = this.data.menu;
    if (menu) opciones.push({ valor: NUEVA, etiqueta: `Nueva lista con el menú «${menu.nombre}»` });
    return opciones;
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.listasService.listar(0, MAX_LISTAS).subscribe({
      next: (pagina) => {
        const activas = pagina.content.filter((l) => l.estado === 'ACTIVA');
        this.listas.set(activas);
        // La más reciente primero (orden de la API); sin listas, la opción de crear una del menú.
        this.destino.set(activas[0]?.id ?? (this.data.menu ? NUEVA : null));
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.errorCarga.set(aApiError(e).detalle);
        this.cargando.set(false);
      },
    });
  }

  protected elegir(destino: string | null): void {
    this.destino.set(destino);
    this.error.set(null);
  }

  protected irAlPlanificador(): void {
    this.ref.close();
    void this.router.navigate(['/planificador']);
  }

  protected guardar(): void {
    const destino = this.destino();
    if (this.guardando() || !destino) return;

    let peticion: Observable<AnadirRecetaListaResultado>;
    if (destino === NUEVA && this.data.menu) {
      peticion = this.listasService.generarDesdeMenu(this.data.menu.id).pipe(map((lista) => ({ lista, nueva: true })));
    } else {
      const raciones = this.raciones();
      if (raciones === null || !(raciones > 0) || raciones > MAX_RACIONES) {
        this.errorRaciones.set(`Las raciones deben ser mayores que 0 y como mucho ${MAX_RACIONES}.`);
        return;
      }
      peticion = this.listasService
        .anadirDesdeReceta(destino, { recetaId: this.data.receta.id, raciones })
        .pipe(map((lista) => ({ lista, nueva: false })));
    }

    this.guardando.set(true);
    this.error.set(null);
    peticion.subscribe({
      next: (resultado) => this.ref.close(resultado),
      error: (e: unknown) => {
        const error = aApiError(e);
        const deRaciones = error.errores.find((c) => c.campo === 'raciones');
        if (deRaciones) this.errorRaciones.set(deRaciones.mensaje);
        else this.error.set(error.detalle);
        this.guardando.set(false);
      },
    });
  }
}
