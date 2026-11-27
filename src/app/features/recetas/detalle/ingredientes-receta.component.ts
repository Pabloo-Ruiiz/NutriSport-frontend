import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { Subject, debounceTime } from 'rxjs';

import type { EstadoConversion, IngredienteRecetaResponse, RecetaResponse } from '@core/models';
import { ETIQUETAS_ESTADO_CONVERSION } from '@core/models/etiquetas';
import { formatearNumero } from '@shared/pipes/formato';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsCheckboxComponent } from '@shared/ui/form/checkbox.component';
import { NsQuantityInputComponent } from '@shared/ui/form/quantity-input.component';

/** Límites del selector de raciones. */
export const RACIONES_MIN = 1;
export const RACIONES_MAX = 20;
/** Espera tras el último cambio de raciones antes de recalcular (al escribir o pulsar seguido). */
const DEBOUNCE_RACIONES_MS = 300;

/** Raciones válidas (entero 1–20) o null. */
export function leerRaciones(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isInteger(n) && n >= RACIONES_MIN && n <= RACIONES_MAX ? n : null;
}

/** "Exacta", "Estimada", "Despreciable", "Sin datos". */
export function etiquetaConversion(estado: EstadoConversion): string {
  const texto = ETIQUETAS_ESTADO_CONVERSION[estado] ?? estado;
  return texto.charAt(0).toLocaleUpperCase('es-ES') + texto.slice(1);
}

/** Gramos de un ingrediente (un decimal por debajo de 100 g): "≈ 13,5" si es estimada, "—" sin datos, "0" si es despreciable. */
export function textoGramos(i: Pick<IngredienteRecetaResponse, 'gramos' | 'estadoConversion'>): string {
  if (i.estadoConversion === 'SIN_DATOS' || i.gramos === null) return '—';
  const cifra = formatearNumero(i.gramos, i.gramos < 100 && !Number.isInteger(i.gramos) ? 1 : 0);
  return i.estadoConversion === 'ESTIMADA' ? `≈ ${cifra}` : cifra;
}

/**
 * Ingredientes y cantidades de una receta (DESIGN.md §7.22): selector de raciones (1–20, con la
 * marca "supuestas" si no están fijadas) y tabla con el nombre (traducido si está emparejado, con
 * el original debajo), la medida original, los gramos calculados y el estado de la conversión. Cada
 * fila tiene una casilla para ir tachando mientras se cocina.
 *
 * No pide nada: emite las raciones elegidas y quien lo usa recarga GET /recetas/{id}?raciones=.
 */
@Component({
  selector: 'app-ingredientes-receta',
  imports: [FormsModule, LucideDynamicIcon, NsBadgeComponent, NsCheckboxComponent, NsQuantityInputComponent],
  templateUrl: './ingredientes-receta.component.html',
  styleUrl: './ingredientes-receta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientesRecetaComponent {
  readonly receta = input.required<RecetaResponse>();
  /** true mientras se recalculan las cantidades. */
  readonly actualizando = input(false);
  /** Nivel del título según la jerarquía de la página. */
  readonly nivelTitulo = input<2 | 3>(2);
  readonly racionesCambiadas = output<number>();

  protected readonly min = RACIONES_MIN;
  protected readonly max = RACIONES_MAX;
  protected readonly etiquetaConversion = etiquetaConversion;
  protected readonly textoGramos = textoGramos;

  /** Lo que muestra el selector; sigue a la receta hasta que se cambia. */
  protected readonly raciones = linkedSignal(() => this.receta().raciones);
  /** Filas tachadas (por índice); se vacían al cambiar de receta. */
  protected readonly tachados = linkedSignal<string, ReadonlySet<number>>({
    source: () => this.receta().id,
    computation: () => new Set(),
  });
  protected readonly hayOriginales = computed(() => this.receta().ingredientes.some((i) => !!i.nombreOriginal));

  private readonly cambios = new Subject<number>();

  constructor() {
    this.cambios.pipe(debounceTime(DEBOUNCE_RACIONES_MS), takeUntilDestroyed()).subscribe((raciones) => {
      if (raciones !== this.receta().raciones) this.racionesCambiadas.emit(raciones);
    });
  }

  protected cambiarRaciones(valor: number | null): void {
    const raciones = leerRaciones(valor);
    if (raciones === null) return;
    this.raciones.set(raciones);
    this.cambios.next(raciones);
  }

  protected alternar(indice: number): void {
    this.tachados.update((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(indice)) siguiente.delete(indice);
      else siguiente.add(indice);
      return siguiente;
    });
  }

  /** Texto bajo el nombre: el original de la fuente y si está sin emparejar. */
  protected subtitulo(i: IngredienteRecetaResponse): string | null {
    const original = i.nombreOriginal && i.nombreOriginal !== i.nombre ? i.nombreOriginal : null;
    if (i.alimentoId === null) return [original, 'sin emparejar'].filter(Boolean).join(' · ');
    return original;
  }
}
