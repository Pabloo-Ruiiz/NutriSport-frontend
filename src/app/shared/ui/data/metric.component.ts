import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, numberAttribute } from '@angular/core';

import { formatearNumero } from '@shared/pipes/formato';

export type NsTendencia = 'up' | 'down' | 'flat';

/**
 * Cifra con etiqueta y variación (DESIGN.md §5.5 variante metric y §9.5).
 *
 *   <ns-metric label="Proteínas" [value]="112" unit="g" [delta]="8" contextoDelta="frente a ayer" />
 *   <ns-metric label="Peso" [value]="72.4" unit="kg" [decimales]="1" [delta]="-0.6" [aumentoBueno]="false" />
 *
 * - `trend` se deduce del signo de `delta` si no se indica.
 * - `aumentoBueno` decide el color: si subir es bueno, ▲ va en éxito y ▼ en error; si no, al revés.
 *   Sin cambios, en neutro. La flecha va con texto ("Sube 8 g"), no solo con color.
 */
@Component({
  selector: 'ns-metric',
  template: `
    <span class="ns-metric__label ns-text-overline">{{ label() }}</span>
    <span class="ns-metric__valor">
      <span class="ns-text-metric-lg ns-tnum">{{ valorTexto() }}</span>
      @if (unit()) {
        <span class="ns-metric__unidad">{{ unit() }}</span>
      }
    </span>
    @if (delta() !== undefined) {
      <span class="ns-metric__delta" [class]="'ns-metric__delta ns-metric__delta--' + sentido()">
        <span aria-hidden="true">{{ flecha() }} {{ deltaTexto() }}</span>
        <span class="ns-sr-only">{{ deltaAccesible() }}</span>
        @if (contextoDelta()) {
          <span class="ns-metric__contexto">{{ contextoDelta() }}</span>
        }
      </span>
    }
  `,
  styleUrl: './metric.component.scss',
  host: { class: 'ns-metric' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsMetricComponent {
  readonly label = input.required<string>();
  readonly value = input<number | string | null>(null);
  readonly unit = input('');
  readonly decimales = input(0, { transform: numberAttribute });
  /** Variación con signo (+8, -0.6). */
  readonly delta = input<number | undefined>();
  /** Unidad de la variación; por defecto la de la cifra. Usa "%" para porcentajes. */
  readonly unidadDelta = input<string>();
  /** Texto tras la variación: "frente a ayer", "esta semana". */
  readonly contextoDelta = input<string>();
  readonly trend = input<NsTendencia>();
  /** true si subir es una buena noticia (por defecto). Para el peso en pérdida de grasa, false. */
  readonly aumentoBueno = input(true, { transform: booleanAttribute });

  protected readonly valorTexto = computed(() => {
    const valor = this.value();
    return typeof valor === 'number' ? formatearNumero(valor, this.decimales()) : (valor ?? '—');
  });

  protected readonly tendencia = computed<NsTendencia>(() => {
    const explicita = this.trend();
    if (explicita) return explicita;
    const delta = this.delta() ?? 0;
    return delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  });

  /** buena / mala / neutra: decide el color. */
  protected readonly sentido = computed(() => {
    const tendencia = this.tendencia();
    if (tendencia === 'flat') return 'neutra';
    return (tendencia === 'up') === this.aumentoBueno() ? 'buena' : 'mala';
  });

  protected readonly flecha = computed(() => ({ up: '▲', down: '▼', flat: '=' })[this.tendencia()]);

  protected readonly deltaTexto = computed(() => {
    const unidad = this.unidadDelta() ?? this.unit();
    const numero = formatearNumero(Math.abs(this.delta() ?? 0), this.decimales());
    if (!unidad) return numero;
    return unidad === '%' ? `${numero} %` : `${numero} ${unidad}`;
  });

  protected readonly deltaAccesible = computed(() => {
    const verbo = { up: 'Sube', down: 'Baja', flat: 'Sin cambios:' }[this.tendencia()];
    return `${verbo} ${this.deltaTexto()}`;
  });
}
