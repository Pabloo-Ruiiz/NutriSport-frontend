import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, model } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { desdeFechaApi, diasEntre, hoyLocal, lunesDeLaSemana, sumarDias } from '@core/util/fechas';

interface DiaTira {
  fecha: string;
  diaSemana: string;
  numero: number;
  etiqueta: string;
  hoy: boolean;
  seleccionado: boolean;
  marcado: boolean;
  deshabilitado: boolean;
}

const DIA_SEMANA = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
const FECHA_LARGA = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Tira de 7 días (DESIGN.md §5.13): día de la semana en caption y número en h4; el seleccionado
 * con fondo ink-950 y texto blanco; los días con registros, con un punto green-500 (y texto para
 * lectores de pantalla).
 *
 *   <ns-date-strip [(selected)]="fecha" [markedDates]="diasConComidas()" [max]="hoy" />
 *
 * Muestra los 7 días alrededor de la fecha seleccionada. Las flechas mueven la tira una semana
 * sin cambiar la selección; al elegir un día, la tira vuelve a centrarse en él.
 */
@Component({
  selector: 'ns-date-strip',
  imports: [LucideDynamicIcon],
  template: `
    <button type="button" class="ns-date-strip__flecha" aria-label="Semana anterior" (click)="moverSemana(-1)">
      <svg lucideIcon="chevron-left" [size]="20" aria-hidden="true"></svg>
    </button>
    <div class="ns-date-strip__dias" role="group" [attr.aria-label]="etiqueta()">
      @for (dia of dias(); track dia.fecha) {
        <button
          type="button"
          class="ns-date-strip__dia"
          [class.ns-date-strip__dia--seleccionado]="dia.seleccionado"
          [class.ns-date-strip__dia--hoy]="dia.hoy"
          [attr.aria-pressed]="dia.seleccionado"
          [attr.aria-current]="dia.hoy ? 'date' : null"
          [attr.aria-label]="dia.etiqueta"
          [attr.data-fecha]="dia.fecha"
          [disabled]="dia.deshabilitado"
          (click)="selected.set(dia.fecha)"
        >
          <span class="ns-date-strip__semana" aria-hidden="true">{{ dia.diaSemana }}</span>
          <span class="ns-date-strip__numero" aria-hidden="true">{{ dia.numero }}</span>
          <span
            class="ns-date-strip__punto"
            [class.ns-date-strip__punto--visible]="dia.marcado"
            aria-hidden="true"
          ></span>
        </button>
      }
    </div>
    <button
      type="button"
      class="ns-date-strip__flecha"
      aria-label="Semana siguiente"
      [disabled]="siguienteDeshabilitada()"
      (click)="moverSemana(1)"
    >
      <svg lucideIcon="chevron-right" [size]="20" aria-hidden="true"></svg>
    </button>
  `,
  styleUrl: './date-strip.component.scss',
  host: { class: 'ns-date-strip' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsDateStripComponent {
  /** Fecha seleccionada "AAAA-MM-DD"; admite [(selected)]. */
  readonly selected = model(hoyLocal());
  /** Fechas "AAAA-MM-DD" con datos (comidas, entrenos): llevan un punto. */
  readonly markedDates = input<readonly string[]>([]);
  /** Última fecha que se puede elegir (p. ej. hoy, para no registrar en el futuro). */
  readonly max = input<string>();
  /** Fecha de hoy; se puede fijar en pruebas. */
  readonly hoy = input(hoyLocal());
  readonly etiqueta = input('Elegir día');
  /**
   * Qué 7 días muestra: 'centrado' (por defecto) → 3 antes y 3 después del día central;
   * 'semana' → de lunes a domingo de la semana del día central (planificador).
   */
  readonly modo = input<'centrado' | 'semana'>('centrado');

  /** Día central de la tira: sigue a la selección y las flechas lo mueven de 7 en 7. */
  protected readonly centro = linkedSignal(() => this.selected());

  /** Primer día de la tira. */
  private readonly inicio = computed(() =>
    this.modo() === 'semana' ? lunesDeLaSemana(this.centro()) : sumarDias(this.centro(), -3),
  );

  protected readonly dias = computed<DiaTira[]>(() => {
    const marcados = new Set(this.markedDates());
    const max = this.max();
    return [0, 1, 2, 3, 4, 5, 6].map((desplazamiento) => {
      const fecha = sumarDias(this.inicio(), desplazamiento);
      const fechaDate = desdeFechaApi(fecha);
      const marcado = marcados.has(fecha);
      const hoy = fecha === this.hoy();
      const etiqueta = [FECHA_LARGA.format(fechaDate), hoy ? 'hoy' : '', marcado ? 'con registros' : '']
        .filter(Boolean)
        .join(', ');
      return {
        fecha,
        diaSemana: DIA_SEMANA.format(fechaDate).replace('.', ''),
        numero: fechaDate.getDate(),
        etiqueta,
        hoy,
        seleccionado: fecha === this.selected(),
        marcado,
        deshabilitado: max !== undefined && diasEntre(max, fecha) > 0,
      };
    });
  });

  /** Sin días elegibles en la semana siguiente. */
  protected readonly siguienteDeshabilitada = computed(() => {
    const max = this.max();
    return max !== undefined && diasEntre(max, sumarDias(this.inicio(), 7)) > 0;
  });

  /** Mueve la tira una semana adelante (1) o atrás (-1). */
  moverSemana(direccion: 1 | -1): void {
    this.centro.update((centro) => sumarDias(centro, 7 * direccion));
  }
}
