import { ChangeDetectionStrategy, Component, computed, input, numberAttribute, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

export type NsEstadoPaso = 'completado' | 'actual' | 'pendiente';

export interface NsPaso {
  etiqueta: string;
  /** Si se omite, se deduce de `actual`: antes, completado; después, pendiente. */
  estado?: NsEstadoPaso;
}

const TEXTO_ESTADO: Record<NsEstadoPaso, string> = {
  completado: 'completado',
  actual: 'paso actual',
  pendiente: 'pendiente',
};

/**
 * Pasos de un asistente (DESIGN.md §5.14, configuración inicial del perfil §7.3): completado en
 * green-700 con check, actual con borde green-700 y pendiente en border-strong.
 * En móvil (< 768 px) se resume en "Paso 2 de 4 · Objetivos" con una barra.
 *
 *   <ns-stepper [pasos]="['Datos', 'Objetivos', 'Actividad', 'Preferencias']" [actual]="1"
 *               (pasoPulsado)="irA($event)" />
 *
 * Los pasos completados son botones para volver a ellos (emiten `pasoPulsado` con su índice).
 */
@Component({
  selector: 'ns-stepper',
  imports: [LucideDynamicIcon],
  template: `
    <nav class="ns-stepper" [attr.aria-label]="etiqueta()">
      <ol class="ns-stepper__lista">
        @for (paso of pasosConEstado(); track $index; let i = $index; let ultimo = $last) {
          <li
            class="ns-stepper__paso"
            [class]="'ns-stepper__paso ns-stepper__paso--' + paso.estado"
            [attr.aria-current]="paso.estado === 'actual' ? 'step' : null"
          >
            @if (paso.estado === 'completado') {
              <button type="button" class="ns-stepper__marca ns-stepper__marca--boton" (click)="pasoPulsado.emit(i)">
                <svg lucideIcon="check" [size]="16" [strokeWidth]="3" aria-hidden="true"></svg>
                <span class="ns-stepper__etiqueta">{{ paso.etiqueta }}</span>
                <span class="ns-sr-only">({{ textoEstado(paso.estado) }})</span>
              </button>
            } @else {
              <span class="ns-stepper__marca">
                <span class="ns-stepper__numero" aria-hidden="true">{{ i + 1 }}</span>
                <span class="ns-stepper__etiqueta">{{ paso.etiqueta }}</span>
                <span class="ns-sr-only">({{ textoEstado(paso.estado) }})</span>
              </span>
            }
            @if (!ultimo) {
              <span class="ns-stepper__linea" aria-hidden="true"></span>
            }
          </li>
        }
      </ol>

      <div class="ns-stepper__movil">
        <p class="ns-stepper__resumen">
          <span class="ns-stepper__contador">Paso {{ indiceActual() + 1 }} de {{ pasos().length }}</span>
          @if (pasoActual()) {
            · {{ pasoActual()!.etiqueta }}
          }
        </p>
        <span class="ns-stepper__barra" aria-hidden="true">
          <span class="ns-stepper__barra-relleno" [style.transform]="'scaleX(' + avance() + ')'"></span>
        </span>
      </div>
    </nav>
  `,
  styleUrl: './stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsStepperComponent {
  /** Pasos: textos o { etiqueta, estado }. */
  readonly pasos = input.required<readonly (string | NsPaso)[]>();
  /** Índice (desde 0) del paso actual. */
  readonly actual = input(0, { transform: numberAttribute });
  readonly etiqueta = input('Progreso');

  /** Índice de un paso completado que se ha pulsado para volver a él. */
  readonly pasoPulsado = output<number>();

  protected readonly pasosConEstado = computed(() =>
    this.pasos().map((paso, i): Required<NsPaso> => {
      const base = typeof paso === 'string' ? { etiqueta: paso } : paso;
      const deducido: NsEstadoPaso = i < this.actual() ? 'completado' : i === this.actual() ? 'actual' : 'pendiente';
      return { etiqueta: base.etiqueta, estado: base.estado ?? deducido };
    }),
  );

  protected readonly indiceActual = computed(() => {
    const indice = this.pasosConEstado().findIndex((p) => p.estado === 'actual');
    return indice >= 0 ? indice : Math.min(this.actual(), this.pasos().length - 1);
  });
  protected readonly pasoActual = computed(() => this.pasosConEstado()[this.indiceActual()]);
  protected readonly avance = computed(() =>
    this.pasos().length ? (this.indiceActual() + 1) / this.pasos().length : 0,
  );

  protected textoEstado(estado: NsEstadoPaso): string {
    return TEXTO_ESTADO[estado];
  }
}
