import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { Subscription } from 'rxjs';

import type { ListaCompraResponse, ListaCompraResumenResponse, Pagina } from '@core/models';
import { ListasCompraService } from '@core/services/listas-compra.service';
import { aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsProgressBarComponent } from '@shared/ui/data/progress-bar.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsPaginatorComponent } from '@shared/ui/nav/paginator.component';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { TAMANO_PAGINA_LISTAS, etiquetaRango } from './compra';
import { RenombrarListaDialogComponent, type RenombrarListaData } from './renombrar-lista-dialog.component';

type Estado = 'cargando' | 'listo' | 'error';

/**
 * Mis listas de la compra (/compra, DESIGN.md §7.12 y docs/api/compra.md §6).
 *
 * Tarjetas con el nombre (enlace al detalle), el rango de fechas del menú de origen, el progreso
 * "12 / 34 comprados", el badge "Completada" y las acciones Abrir, Renombrar y Eliminar. Las listas
 * se generan desde el planificador ("Lista de la compra"), por eso el estado vacío lleva allí.
 */
@Component({
  selector: 'app-listas-compra',
  imports: [
    ...NS_CARD,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    LucideDynamicIcon,
    NsAlertComponent,
    NsBadgeComponent,
    NsButtonComponent,
    NsEmptyStateComponent,
    NsPaginatorComponent,
    NsProgressBarComponent,
    NsSkeletonComponent,
    RouterLink,
  ],
  templateUrl: './listas-compra.component.html',
  styleUrl: './listas-compra.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListasCompraComponent {
  private readonly listasService = inject(ListasCompraService);
  private readonly router = inject(Router);
  private readonly dialogos = inject(NsDialogService);
  private readonly confirmacion = inject(NsConfirmService);
  private readonly toast = inject(NsToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pagina = signal<Pagina<ListaCompraResumenResponse> | null>(null);
  protected readonly page = signal(0);
  protected readonly estado = signal<Estado>('cargando');
  protected readonly error = signal<string | null>(null);
  /** Id de la lista con una acción en curso (eliminar). */
  protected readonly ocupada = signal<string | null>(null);

  protected readonly rango = etiquetaRango;
  protected readonly esqueletos = [1, 2, 3];

  private peticion: Subscription | null = null;

  constructor() {
    this.cargar();
    this.destroyRef.onDestroy(() => this.peticion?.unsubscribe());
  }

  protected cargar(page = this.page()): void {
    this.peticion?.unsubscribe();
    this.page.set(page);
    this.estado.set('cargando');
    this.error.set(null);
    this.peticion = this.listasService
      .listar(page, TAMANO_PAGINA_LISTAS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => {
          // Si la página se ha quedado vacía (p. ej. tras eliminar la última), vuelve a la anterior.
          if (pagina.content.length === 0 && page > 0) {
            this.cargar(Math.min(page - 1, Math.max(pagina.totalPages - 1, 0)));
            return;
          }
          this.pagina.set(pagina);
          this.estado.set('listo');
        },
        error: (e: unknown) => {
          this.error.set(aApiError(e).detalle);
          this.estado.set('error');
        },
      });
  }

  protected irAPagina(page: number): void {
    this.cargar(page);
  }

  protected abrir(lista: ListaCompraResumenResponse): void {
    void this.router.navigate(['/compra', lista.id]);
  }

  protected renombrar(lista: ListaCompraResumenResponse): void {
    this.dialogos
      .open<RenombrarListaDialogComponent, ListaCompraResponse, RenombrarListaData>(RenombrarListaDialogComponent, {
        titulo: 'Renombrar lista',
        size: 'sm',
        data: { lista },
      })
      .closed.subscribe((actualizada) => {
        if (actualizada) this.sustituir(actualizada);
      });
  }

  protected async eliminar(lista: ListaCompraResumenResponse): Promise<void> {
    const confirmado = await this.confirmacion.confirmar({
      titulo: '¿Eliminar la lista?',
      mensaje: `Se borrará «${lista.nombre}» con todos sus productos.`,
      textoConfirmar: 'Eliminar lista',
      peligro: true,
    });
    if (!confirmado || this.ocupada()) return;
    this.ocupada.set(lista.id);
    this.listasService.eliminar(lista.id).subscribe({
      next: () => {
        this.ocupada.set(null);
        this.toast.exito('Lista eliminada', lista.nombre);
        this.cargar();
      },
      error: (e: unknown) => {
        this.ocupada.set(null);
        this.toast.error('No se ha podido eliminar la lista', aApiError(e).detalle);
      },
    });
  }

  /** Aplica la respuesta del PATCH a la tarjeta (sin recargar la página). */
  private sustituir(lista: ListaCompraResponse): void {
    this.pagina.update((p) =>
      p
        ? {
            ...p,
            content: p.content.map((l) =>
              l.id === lista.id
                ? {
                    ...l,
                    nombre: lista.nombre,
                    estado: lista.estado,
                    comprados: lista.comprados,
                    total: lista.total,
                    fechaDesde: lista.fechaDesde,
                    fechaHasta: lista.fechaHasta,
                  }
                : l,
            ),
          }
        : p,
    );
  }
}
