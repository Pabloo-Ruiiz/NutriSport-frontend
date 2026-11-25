import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, numberAttribute } from '@angular/core';

import { formatearNumero } from '@shared/pipes/formato';
import { NsColorDato, NsColorEstado, colorCss, proporcion } from './colores';

/**
 * Barra de progreso (DESIGN.md §5.14): 8 px, radio full, color por dato o estado y etiqueta
 * opcional "112 / 160 g".
 *
 *   <ns-progress-bar [value]="112" [max]="160" color="protein" unidad="g" etiqueta="Proteínas" showLabel />
 *
 * Mismo patrón accesible que ns-ring: role="progressbar"; con exceso, aria-valuenow vale max y
 * aria-valuetext lo cuenta. El exceso se pinta en --ns-warning con rayas.
 */
@Component({
  selector: 'ns-progress-bar',
  template: `
    @if (showLabel()) {
      <span class="ns-progress__etiqueta" aria-hidden="true">
        <span class="ns-progress__valor">{{ valorTexto() }}</span> / {{ maxTexto() }}
      </span>
    }
    <span
      class="ns-progress__pista"
      role="progressbar"
      aria-valuemin="0"
      [attr.aria-valuemax]="max()"
      [attr.aria-valuenow]="valorAria()"
      [attr.aria-valuetext]="textoAria()"
      [attr.aria-label]="etiqueta()"
      [style.height.px]="alto()"
    >
      <span class="ns-progress__relleno" [style.background]="colorRelleno()" [style.transform]="escala()"></span>
    </span>
  `,
  styleUrl: './progress-bar.component.scss',
  host: {
    class: 'ns-progress',
    '[class.ns-progress--exceso]': 'exceso() > 0',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsProgressBarComponent {
  readonly value = input(0, { transform: numberAttribute });
  readonly max = input(100, { transform: numberAttribute });
  readonly color = input<NsColorDato | NsColorEstado>('kcal');
  /** Muestra "valor / max unidad" encima de la barra. */
  readonly showLabel = input(false, { transform: booleanAttribute });
  /** Alto de la barra en px (8 por defecto). */
  readonly alto = input(8, { transform: numberAttribute });
  readonly etiqueta = input.required<string>();
  readonly unidad = input('');
  readonly decimales = input(0, { transform: numberAttribute });

  readonly exceso = computed(() => Math.max(0, this.value() - this.max()));
  protected readonly colorRelleno = computed(() => (this.exceso() > 0 ? null : colorCss(this.color())));
  protected readonly escala = computed(() => `scaleX(${proporcion(this.value(), this.max())})`);
  protected readonly valorAria = computed(() => Math.min(Math.max(this.value(), 0), this.max()));

  protected readonly valorTexto = computed(() => formatearNumero(this.value(), this.decimales()));
  protected readonly maxTexto = computed(() => this.conUnidad(this.max()));
  protected readonly textoAria = computed(() => {
    const base = `${this.valorTexto()} de ${this.maxTexto()}`;
    return this.exceso() > 0 ? `${base}, ${this.conUnidad(this.exceso())} por encima` : base;
  });

  private conUnidad(valor: number): string {
    const numero = formatearNumero(valor, this.decimales());
    return this.unidad() ? `${numero} ${this.unidad()}` : numero;
  }
}
