import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { Observable, Subscription } from 'rxjs';

import { LayoutService } from '@core/layout/layout.service';
import type { ListaCompraResponse, ProductoCompraResponse } from '@core/models';
import { ListasCompraService } from '@core/services/listas-compra.service';
import { aApiError } from '@core/util/api-error';
import { lunesDeLaSemana } from '@core/util/fechas';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsProgressBarComponent } from '@shared/ui/data/progress-bar.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSwitchComponent } from '@shared/ui/form/switch.component';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { AnadirProductoDialogComponent, type AnadirProductoData } from './anadir-producto-dialog.component';
import { MAX_NOMBRE_LISTA, etiquetaRango, marcarComprado, seccionesVisibles, textoCompartir } from './compra';
import type { EdicionProducto } from './producto-compra-item.component';
import { SeccionCompraComponent } from './seccion-compra.component';

type Estado = 'cargando' | 'listo' | 'no-encontrada' | 'error';

/**
 * Detalle de una lista de la compra (/compra/:id, DESIGN.md §7.12 y docs/api/compra.md §6).
 * Pensada mobile-first para usarla en el supermercado: filas de 56 px y botón "Añadir" flotante.
 *
 * - Cabecera: nombre editable en línea, menú y rango de origen, progreso y acciones (Añadir
 *   producto, Ocultar comprados, Completar/Reabrir y Compartir).
 * - Secciones colapsables con sus productos. Marcar comprado es optimista (tacha y mueve al final
 *   al momento, PATCH { comprado } y revierte si falla); el resto de cambios sustituye la lista
 *   con la respuesta del servidor.
 */
@Component({
  selector: 'app-lista-compra',
  imports: [
    FormsModule,
    LucideDynamicIcon,
    NsAlertComponent,
    NsBadgeComponent,
    NsButtonComponent,
    NsEmptyStateComponent,
    NsInputDirective,
    NsProgressBarComponent,
    NsSkeletonComponent,
    NsSwitchComponent,
    RouterLink,
    SeccionCompraComponent,
  ],
  templateUrl: './lista-compra.component.html',
  styleUrl: './lista-compra.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaCompraComponent {
  /** :id de la ruta (withComponentInputBinding). */
  readonly id = input.required<string>();

  private readonly listasService = inject(ListasCompraService);
  private readonly dialogos = inject(NsDialogService);
  private readonly toast = inject(NsToastService);
  protected readonly esMovil = inject(LayoutService).esMovil;

  protected readonly lista = signal<ListaCompraResponse | null>(null);
  protected readonly estado = signal<Estado>('cargando');
  protected readonly error = signal<string | null>(null);

  protected readonly ocultarComprados = signal(false);
  /** Ids de productos con una edición o un borrado en curso. */
  protected readonly ocupados = signal<ReadonlySet<string>>(new Set());
  /** Renombrar, completar o reabrir en curso. */
  protected readonly guardandoLista = signal(false);

  protected readonly editandoNombre = signal(false);
  protected readonly nombreEditado = signal('');
  protected readonly maxNombre = MAX_NOMBRE_LISTA;

  protected readonly secciones = computed(() => {
    const lista = this.lista();
    return lista ? seccionesVisibles(lista, this.ocultarComprados()) : [];
  });
  protected readonly rango = computed(() => {
    const l = this.lista();
    return l ? etiquetaRango(l.fechaDesde, l.fechaHasta) : null;
  });
  /** ?semana= del planificador para volver al menú de origen. */
  protected readonly semanaMenu = computed(() => {
    const l = this.lista();
    const fecha = l?.fechaDesde ?? l?.fechaHasta;
    return l?.menuId && fecha ? lunesDeLaSemana(fecha) : null;
  });
  protected readonly completada = computed(() => this.lista()?.estado === 'COMPLETADA');
  protected readonly todoComprado = computed(() => {
    const l = this.lista();
    return !!l && l.total > 0 && l.comprados >= l.total;
  });

  private peticion: Subscription | null = null;
  /** PATCH { comprado } en vuelo: solo se aplica la respuesta del último, para no pisar los demás. */
  private marcadosEnCurso = 0;

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.cargar(id));
    });
    inject(DestroyRef).onDestroy(() => this.peticion?.unsubscribe());
  }

  protected cargar(id = this.id()): void {
    this.peticion?.unsubscribe();
    this.estado.set('cargando');
    this.error.set(null);
    this.peticion = this.listasService.detalle(id).subscribe({
      next: (lista) => {
        this.lista.set(lista);
        this.estado.set('listo');
      },
      error: (e: unknown) => {
        const error = aApiError(e);
        if (error.status === 404 || error.status === 403) {
          this.estado.set('no-encontrada');
        } else {
          this.error.set(error.detalle);
          this.estado.set('error');
        }
      },
    });
  }

  // ---- Productos

  protected marcar({ producto, comprado }: { producto: ProductoCompraResponse; comprado: boolean }): void {
    const actual = this.lista();
    if (!actual) return;
    this.lista.set(marcarComprado(actual, producto.id, comprado));
    this.marcadosEnCurso++;
    this.listasService.actualizarProducto(actual.id, producto.id, { comprado }).subscribe({
      next: (lista) => {
        this.marcadosEnCurso--;
        if (this.marcadosEnCurso === 0) this.lista.set(lista);
      },
      error: (e: unknown) => {
        this.marcadosEnCurso--;
        const ahora = this.lista();
        if (ahora) this.lista.set(marcarComprado(ahora, producto.id, !comprado));
        this.toast.error(
          `No se ha podido ${comprado ? 'marcar' : 'desmarcar'} «${producto.nombre}»`,
          aApiError(e).detalle,
        );
      },
    });
  }

  protected editar({ producto, cambios }: EdicionProducto): void {
    const lista = this.lista();
    if (!lista) return;
    this.enProducto(
      producto,
      this.listasService.actualizarProducto(lista.id, producto.id, cambios),
      'No se ha podido guardar la cantidad',
    );
  }

  protected quitar(producto: ProductoCompraResponse): void {
    const lista = this.lista();
    if (!lista) return;
    this.enProducto(
      producto,
      this.listasService.quitarProducto(lista.id, producto.id),
      'No se ha podido quitar el producto',
      () => this.toast.exito('Producto quitado', producto.nombre),
    );
  }

  protected anadirProducto(): void {
    const lista = this.lista();
    if (!lista) return;
    this.dialogos
      .open<AnadirProductoDialogComponent, ListaCompraResponse, AnadirProductoData>(AnadirProductoDialogComponent, {
        titulo: 'Añadir producto',
        size: 'sm',
        data: { listaId: lista.id, secciones: lista.secciones.map((s) => s.nombre) },
      })
      .closed.subscribe((actualizada) => {
        if (actualizada) this.lista.set(actualizada);
      });
  }

  // ---- Lista

  protected empezarEdicionNombre(): void {
    this.nombreEditado.set(this.lista()?.nombre ?? '');
    this.editandoNombre.set(true);
  }

  protected cancelarEdicionNombre(): void {
    this.editandoNombre.set(false);
  }

  protected guardarNombre(): void {
    const lista = this.lista();
    const nombre = this.nombreEditado().trim();
    if (!lista || this.guardandoLista()) return;
    if (!nombre) {
      this.toast.error('Escribe un nombre para la lista');
      return;
    }
    this.editandoNombre.set(false);
    if (nombre === lista.nombre) return;
    this.enLista(
      this.listasService.actualizar(lista.id, { nombre: nombre.slice(0, MAX_NOMBRE_LISTA) }),
      'No se ha podido cambiar el nombre',
    );
  }

  protected cambiarEstado(): void {
    const lista = this.lista();
    if (!lista) return;
    const estado = lista.estado === 'COMPLETADA' ? 'ACTIVA' : 'COMPLETADA';
    this.enLista(this.listasService.actualizar(lista.id, { estado }), 'No se ha podido guardar el cambio', (l) =>
      this.toast.exito(estado === 'COMPLETADA' ? 'Lista completada' : 'Lista reabierta', l.nombre),
    );
  }

  /** Comparte el texto de la lista con el menú del sistema; si no lo hay, lo copia al portapapeles. */
  protected async compartir(): Promise<void> {
    const lista = this.lista();
    if (!lista) return;
    const texto = textoCompartir(lista);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: lista.nombre, text: texto });
        return;
      } catch (e: unknown) {
        // Cancelado por el usuario: no se hace nada. Otro error: se intenta copiar.
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(texto);
      this.toast.exito('Lista copiada', 'Pégala donde quieras compartirla.');
    } catch {
      this.toast.error('No se ha podido compartir la lista');
    }
  }

  private enLista(
    peticion: Observable<ListaCompraResponse>,
    mensajeError: string,
    alTerminar?: (lista: ListaCompraResponse) => void,
  ): void {
    if (this.guardandoLista()) return;
    this.guardandoLista.set(true);
    peticion.subscribe({
      next: (lista) => {
        this.guardandoLista.set(false);
        this.lista.set(lista);
        alTerminar?.(lista);
      },
      error: (e: unknown) => {
        this.guardandoLista.set(false);
        this.toast.error(mensajeError, aApiError(e).detalle);
      },
    });
  }

  private enProducto(
    producto: ProductoCompraResponse,
    peticion: Observable<ListaCompraResponse>,
    mensajeError: string,
    alTerminar?: () => void,
  ): void {
    if (this.ocupados().has(producto.id)) return;
    const marcarOcupado = (ocupado: boolean) =>
      this.ocupados.update((ids) => {
        const copia = new Set(ids);
        if (ocupado) copia.add(producto.id);
        else copia.delete(producto.id);
        return copia;
      });
    marcarOcupado(true);
    peticion.subscribe({
      next: (lista) => {
        marcarOcupado(false);
        this.lista.set(lista);
        alTerminar?.();
      },
      error: (e: unknown) => {
        marcarOcupado(false);
        this.toast.error(mensajeError, aApiError(e).detalle);
      },
    });
  }
}
