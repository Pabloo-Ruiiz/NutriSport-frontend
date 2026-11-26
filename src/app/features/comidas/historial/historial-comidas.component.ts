import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { LayoutService } from '@core/layout/layout.service';
import type { RegistroComidaResponse } from '@core/models';
import { ComidasService } from '@core/services/comidas.service';
import { aApiError } from '@core/util/api-error';
import { hoyLocal, sumarDias } from '@core/util/fechas';
import { formatearFecha, formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { peticionDesdeRespuesta } from '../componentes/comida-util';
import {
  DetalleComidaComponent,
  type DetalleComidaData,
  type ResultadoDetalleComida,
} from '../componentes/detalle-comida.component';
import {
  DuplicarComidaDialogComponent,
  type DuplicarComidaData,
} from '../componentes/duplicar-comida-dialog.component';
import { MealCardComponent } from '../componentes/meal-card.component';
import { FiltrosHistorialComponent } from './filtros-historial.component';
import { FiltrosSheetComponent } from './filtros-sheet.component';
import { DIAS_POR_TRAMO, type FiltrosHistorial, HistorialComidasStore } from './historial-comidas.store';

/**
 * Historial de comidas (/comidas, DESIGN.md §7.9): filtros (en móvil, en un bottom sheet), resumen
 * del periodo y comidas agrupadas por día con su tarjeta `meal`. Desde cada tarjeta: ver el detalle,
 * editar, duplicar en otra fecha o eliminar (al momento, con "Deshacer" en el toast).
 */
@Component({
  selector: 'app-historial-comidas',
  imports: [
    FiltrosHistorialComponent,
    MealCardComponent,
    NS_CARD,
    NsAlertComponent,
    NsButtonComponent,
    NsEmptyStateComponent,
    NsSkeletonComponent,
    RouterLink,
  ],
  templateUrl: './historial-comidas.component.html',
  styleUrl: './historial-comidas.component.scss',
  providers: [HistorialComidasStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialComidasComponent {
  protected readonly store = inject(HistorialComidasStore);
  protected readonly layout = inject(LayoutService);
  private readonly comidasService = inject(ComidasService);
  private readonly dialogos = inject(NsDialogService);
  private readonly toasts = inject(NsToastService);
  private readonly router = inject(Router);

  protected readonly diasPorTramo = DIAS_POR_TRAMO;

  /** "Del 28 oct al 26 nov" (incluye lo cargado con "Cargar más"). */
  protected readonly periodo = computed(
    () =>
      `Del ${formatearFecha(this.store.desdeCargado(), 'diaMes')} al ${formatearFecha(this.store.filtros().hasta, 'diaMes')}`,
  );
  protected readonly numeroFiltros = computed(() => {
    const f = this.store.filtros();
    return (f.tipo ? 1 : 0) + (f.origenes.length ? 1 : 0);
  });

  constructor() {
    this.store.cargar();
  }

  protected kcal(valor: number): string {
    return formatearNumero(valor);
  }

  /** "Hoy · jueves, 26 de noviembre". */
  protected cabeceraDia(fecha: string): string {
    const hoy = hoyLocal();
    const larga = formatearFecha(fecha, 'larga');
    if (fecha === hoy) return `Hoy · ${larga}`;
    if (fecha === sumarDias(hoy, -1)) return `Ayer · ${larga}`;
    if (fecha === sumarDias(hoy, 1)) return `Mañana · ${larga}`;
    return larga;
  }

  protected alCambiarFiltros(filtros: FiltrosHistorial | null): void {
    if (filtros) this.store.aplicarFiltros(filtros);
  }

  protected quitarFiltros(): void {
    this.store.aplicarFiltros({ ...this.store.filtros(), tipo: null, origenes: [] });
  }

  protected abrirFiltros(): void {
    const ref = this.dialogos.open<FiltrosSheetComponent, FiltrosHistorial, FiltrosHistorial>(FiltrosSheetComponent, {
      titulo: 'Filtros',
      data: this.store.filtros(),
    });
    ref.closed.subscribe((filtros) => {
      if (filtros) this.store.aplicarFiltros(filtros);
    });
  }

  protected cargarMas(): void {
    this.store.cargarMas().subscribe({
      error: (e: unknown) => this.toasts.error('No hemos podido cargar más días', aApiError(e).detalle),
    });
  }

  protected ver(comida: RegistroComidaResponse): void {
    const ref = this.dialogos.open<DetalleComidaComponent, ResultadoDetalleComida, DetalleComidaData>(
      DetalleComidaComponent,
      { titulo: 'Detalle de la comida', size: 'lg', data: { comida } },
    );
    ref.closed.subscribe((resultado) => {
      if (resultado?.accion === 'editar') this.editar(resultado.comida);
      else if (resultado?.accion === 'duplicar') this.duplicar(resultado.comida);
    });
  }

  protected editar(comida: RegistroComidaResponse): void {
    void this.router.navigate(['/comidas', comida.id, 'editar']);
  }

  protected duplicar(comida: RegistroComidaResponse): void {
    const ref = this.dialogos.open<DuplicarComidaDialogComponent, RegistroComidaResponse, DuplicarComidaData>(
      DuplicarComidaDialogComponent,
      { titulo: 'Duplicar comida', size: 'sm', data: { comida } },
    );
    ref.closed.subscribe((nueva) => {
      if (!nueva) return;
      this.store.insertar(nueva);
      this.toasts.exito('Comida duplicada', this.cabeceraDia(nueva.fecha));
    });
  }

  /** Quita la tarjeta al momento y la borra; si falla, vuelve a ponerla. */
  protected eliminar(comida: RegistroComidaResponse): void {
    this.store.quitar(comida.id);
    this.comidasService.eliminar(comida.id).subscribe({
      next: () => this.avisarEliminada(comida),
      error: (e: unknown) => {
        const error = aApiError(e);
        // Ya no existía: el resultado es el mismo.
        if (error.status === 404) return;
        this.store.insertar(comida);
        this.toasts.error('No hemos podido eliminar la comida', error.detalle);
      },
    });
  }

  private avisarEliminada(comida: RegistroComidaResponse): void {
    const recuperada = peticionDesdeRespuesta(comida);
    this.toasts.exito(
      'Comida eliminada',
      undefined,
      recuperada ? { texto: 'Deshacer', ejecutar: () => this.deshacer(comida) } : undefined,
    );
  }

  /** "Deshacer": la vuelve a registrar (POST /comidas) con sus alimentos, fecha, hora, tipo y notas. */
  private deshacer(comida: RegistroComidaResponse): void {
    const recuperada = peticionDesdeRespuesta(comida);
    if (!recuperada) return;
    this.comidasService.registrar(recuperada.peticion).subscribe({
      next: (nueva) => {
        this.store.insertar(nueva);
        const { omitidos } = recuperada;
        if (omitidos.length) {
          this.toasts.mostrar({
            tipo: 'warning',
            titulo: 'Comida recuperada en parte',
            mensaje: `No se han podido recuperar: ${omitidos.join(', ')}.`,
          });
        } else {
          this.toasts.exito('Comida recuperada');
        }
      },
      error: (e: unknown) => this.toasts.error('No hemos podido recuperar la comida', aApiError(e).detalle),
    });
  }
}
