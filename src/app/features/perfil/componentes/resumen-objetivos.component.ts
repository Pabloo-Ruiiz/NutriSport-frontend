import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import type { ObjetivosResponse } from '@core/models';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsProgressBarComponent } from '@shared/ui/data/progress-bar.component';
import { NsRingComponent } from '@shared/ui/data/ring.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsDisclaimerComponent } from '@shared/ui/feedback/disclaimer.component';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { ObjetivosManualesDialogComponent } from './objetivos-manuales-dialog.component';

interface Macro {
  clave: 'proteinaG' | 'carbohidratosG' | 'grasaG';
  nombre: string;
  color: 'protein' | 'carbs' | 'fat';
  kcalPorGramo: number;
}

const MACROS: readonly Macro[] = [
  { clave: 'proteinaG', nombre: 'Proteína', color: 'protein', kcalPorGramo: 4 },
  { clave: 'carbohidratosG', nombre: 'Hidratos', color: 'carbs', kcalPorGramo: 4 },
  { clave: 'grasaG', nombre: 'Grasa', color: 'fat', kcalPorGramo: 9 },
];

/**
 * Resumen de los objetivos diarios (DESIGN.md §7.3, final del onboarding; Mi perfil, paso 12):
 * anillo de kcal, barras de proteína, hidratos y grasa (en gramos y % de la energía), avisos del
 * servidor, "Cómo lo calculamos" con el desglose y el aviso orientativo.
 *
 * "Ajustar manualmente" abre ObjetivosManualesDialogComponent; con su respuesta se actualiza el
 * resumen (incluidos los avisos, que no bloquean).
 */
@Component({
  selector: 'app-resumen-objetivos',
  imports: [
    RouterLink,
    NsAlertComponent,
    NsBadgeComponent,
    NsButtonComponent,
    NsDisclaimerComponent,
    NsProgressBarComponent,
    NsRingComponent,
  ],
  templateUrl: './resumen-objetivos.component.html',
  styleUrl: './resumen-objetivos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumenObjetivosComponent {
  readonly objetivos = input.required<ObjetivosResponse>();
  /** Muestra "Ir a mi panel" (al final del onboarding). */
  readonly irAlPanel = input(false, { transform: booleanAttribute });

  private readonly dialogos = inject(NsDialogService);

  /** Objetivos que se ven: los de entrada o los que devuelve el diálogo de ajuste manual. */
  protected readonly actuales = linkedSignal(() => this.objetivos());

  protected readonly macros = computed(() => {
    const o = this.actuales();
    return MACROS.map((m) => {
      const gramos = o[m.clave];
      const kcal = gramos * m.kcalPorGramo;
      const porcentaje = o.kcal > 0 ? Math.round((kcal / o.kcal) * 100) : 0;
      return { ...m, gramos, kcal, porcentaje };
    });
  });

  /** Avisos del cálculo y de la respuesta, sin repetir. */
  protected readonly avisos = computed(() => {
    const o = this.actuales();
    return [...new Set([...(o.avisos ?? []), ...(o.desglose?.avisos ?? [])])];
  });

  protected readonly desglose = computed(() => {
    const d = this.actuales().desglose;
    if (!d) return null;
    const ajuste = d.ajustePorcentaje;
    return [
      { termino: 'Edad', valor: `${formatearNumero(d.edad)} años` },
      { termino: 'Metabolismo basal', valor: `${formatearNumero(d.metabolismoBasal)} kcal` },
      { termino: 'Factor de actividad', valor: `× ${formatearNumero(d.factorActividad, 2)}` },
      { termino: 'Gasto sin entreno', valor: `${formatearNumero(d.gastoSinEntreno)} kcal` },
      {
        termino: 'Ajuste por tu objetivo',
        valor: `${ajuste > 0 ? '+' : ajuste < 0 ? '−' : ''}${formatearNumero(Math.abs(ajuste))} %`,
      },
    ];
  });

  protected readonly formatear = formatearNumero;

  protected ajustar(): void {
    const ref = this.dialogos.open<ObjetivosManualesDialogComponent, ObjetivosResponse, ObjetivosResponse>(
      ObjetivosManualesDialogComponent,
      { titulo: 'Ajustar objetivos', size: 'sm', data: this.actuales() },
    );
    ref.closed.subscribe((respuesta) => {
      if (respuesta) this.actuales.set(respuesta);
    });
  }
}
