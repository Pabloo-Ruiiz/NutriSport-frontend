import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, numberAttribute } from '@angular/core';

import { formatearNumero } from '@shared/pipes/formato';
import { idUnico } from '../form/control-campo';
import { NsColorDato, colorCss, proporcion } from './colores';

/**
 * Anillo de progreso (DESIGN.md §5.14): pista surface-sunken y relleno del color del dato.
 * Tamaños habituales 64 / 120 / 180 px; el grosor por defecto va de 10 a 14 px según el tamaño.
 *
 *   <ns-ring [value]="consumidas" [max]="objetivo" color="kcal" unidad="kcal" etiqueta="Energía de hoy"
 *            [size]="180" [valueInterior]="gastoEntreno" [maxInterior]="600" etiquetaInterior="Gasto del entreno">
 *     <span class="ns-text-metric-xl">1.240</span>
 *     <span class="ns-text-caption">kcal restantes</span>
 *   </ns-ring>
 *
 * - Si value > max, el anillo se completa y el exceso se pinta encima con --ns-warning y un
 *   patrón rayado (no depende solo del color), más el texto "+120 kcal".
 * - Cada anillo es un role="progressbar". aria-valuenow no puede pasar de aria-valuemax: con
 *   exceso vale max y aria-valuetext lo cuenta ("1.920 de 1.800 kcal, 120 kcal por encima").
 */
@Component({
  selector: 'ns-ring',
  template: `
    <svg class="ns-ring__svg" [attr.viewBox]="'0 0 ' + size() + ' ' + size()" aria-hidden="true">
      <defs>
        <pattern [id]="idPatron" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect class="ns-ring__patron-fondo" width="6" height="6" />
          <rect class="ns-ring__patron-raya" width="2" height="6" />
        </pattern>
      </defs>
      <g [attr.transform]="'rotate(-90 ' + centro() + ' ' + centro() + ')'">
        <circle
          class="ns-ring__pista"
          [attr.cx]="centro()"
          [attr.cy]="centro()"
          [attr.r]="radio()"
          [attr.stroke-width]="grosorReal()"
        />
        @if (proporcionPrincipal() > 0) {
          <circle
            class="ns-ring__relleno"
            [attr.cx]="centro()"
            [attr.cy]="centro()"
            [attr.r]="radio()"
            [attr.stroke-width]="grosorReal()"
            [style.stroke]="color()"
            pathLength="100"
            [attr.stroke-dasharray]="arco(proporcionPrincipal())"
          />
        }
        @if (proporcionExceso() > 0) {
          <circle
            class="ns-ring__exceso"
            [attr.cx]="centro()"
            [attr.cy]="centro()"
            [attr.r]="radio()"
            [attr.stroke-width]="grosorReal()"
            [attr.stroke]="'url(#' + idPatron + ')'"
            pathLength="100"
            [attr.stroke-dasharray]="arco(proporcionExceso())"
          />
        }
        @if (hayInterior()) {
          <circle
            class="ns-ring__pista"
            [attr.cx]="centro()"
            [attr.cy]="centro()"
            [attr.r]="radioInterior()"
            [attr.stroke-width]="grosorInterior()"
          />
          @if (proporcionInterior() > 0) {
            <circle
              class="ns-ring__relleno"
              [attr.cx]="centro()"
              [attr.cy]="centro()"
              [attr.r]="radioInterior()"
              [attr.stroke-width]="grosorInterior()"
              [style.stroke]="colorInteriorCss()"
              pathLength="100"
              [attr.stroke-dasharray]="arco(proporcionInterior())"
            />
          }
        }
      </g>
    </svg>

    <span
      class="ns-ring__barra"
      role="progressbar"
      aria-valuemin="0"
      [attr.aria-valuemax]="max()"
      [attr.aria-valuenow]="valorAria()"
      [attr.aria-valuetext]="textoAria()"
      [attr.aria-label]="etiqueta()"
    ></span>
    @if (hayInterior()) {
      <span
        class="ns-ring__barra"
        role="progressbar"
        aria-valuemin="0"
        [attr.aria-valuemax]="maxInterior()"
        [attr.aria-valuenow]="valorInteriorAria()"
        [attr.aria-valuetext]="textoInteriorAria()"
        [attr.aria-label]="etiquetaInterior()"
      ></span>
    }

    <div class="ns-ring__centro">
      <ng-content />
      @if (exceso() > 0 && mostrarExceso()) {
        <span class="ns-ring__texto-exceso">+{{ excesoTexto() }}</span>
      }
    </div>
  `,
  styleUrl: './ring.component.scss',
  host: {
    class: 'ns-ring',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsRingComponent {
  readonly value = input(0, { transform: numberAttribute });
  readonly max = input(100, { transform: numberAttribute });
  /** Lado en px. */
  readonly size = input(120, { transform: numberAttribute });
  /** Grosor del trazo en px. Por defecto 10 (≤ 64 px), 12 (≤ 120 px) o 14. */
  readonly grosor = input<number | undefined, unknown>(undefined, { transform: opcionalNumero });
  readonly colorDato = input<NsColorDato>('kcal', { alias: 'color' });
  /** Nombre accesible ("Energía de hoy"). */
  readonly etiqueta = input.required<string>();
  /** Unidad para los textos ("kcal", "g"). */
  readonly unidad = input('');

  /** Segundo anillo interior opcional (p. ej. gasto del entrenamiento en el dashboard). */
  readonly valueInterior = input<number | undefined, unknown>(undefined, { transform: opcionalNumero });
  readonly maxInterior = input<number | undefined, unknown>(undefined, { transform: opcionalNumero });
  readonly colorInterior = input<NsColorDato>('activity');
  readonly etiquetaInterior = input('Progreso secundario');
  /** Texto "+120 kcal" bajo el contenido con exceso. false si el contenido ya lo cuenta. */
  readonly mostrarExceso = input(true, { transform: booleanAttribute });

  protected readonly idPatron = idUnico('ns-ring-patron');

  protected readonly grosorReal = computed(() => {
    const grosor = this.grosor();
    if (grosor) return grosor;
    const size = this.size();
    return size <= 64 ? 10 : size <= 120 ? 12 : 14;
  });
  protected readonly centro = computed(() => this.size() / 2);
  protected readonly radio = computed(() => (this.size() - this.grosorReal()) / 2);
  protected readonly grosorInterior = computed(() => Math.max(6, this.grosorReal() - 4));
  protected readonly radioInterior = computed(
    () => this.radio() - this.grosorReal() / 2 - 4 - this.grosorInterior() / 2,
  );

  protected readonly color = computed(() => colorCss(this.colorDato()));
  protected readonly colorInteriorCss = computed(() => colorCss(this.colorInterior()));

  /** Cuánto pasa de max (0 si no pasa). */
  readonly exceso = computed(() => Math.max(0, this.value() - this.max()));
  protected readonly proporcionPrincipal = computed(() => proporcion(this.value(), this.max()));
  protected readonly proporcionExceso = computed(() => proporcion(this.exceso(), this.max()));

  protected readonly hayInterior = computed(() => this.valueInterior() !== undefined && (this.maxInterior() ?? 0) > 0);
  protected readonly proporcionInterior = computed(() =>
    proporcion(this.valueInterior() ?? 0, this.maxInterior() ?? 0),
  );

  protected readonly valorAria = computed(() => Math.min(Math.max(this.value(), 0), this.max()));
  protected readonly valorInteriorAria = computed(() =>
    Math.min(Math.max(this.valueInterior() ?? 0, 0), this.maxInterior() ?? 0),
  );
  protected readonly excesoTexto = computed(() => this.conUnidad(this.exceso()));
  protected readonly textoAria = computed(() => {
    const base = `${this.conUnidad(this.value(), false)} de ${this.conUnidad(this.max())}`;
    return this.exceso() > 0 ? `${base}, ${this.excesoTexto()} por encima` : base;
  });
  protected readonly textoInteriorAria = computed(
    () => `${this.conUnidad(this.valueInterior() ?? 0, false)} de ${this.conUnidad(this.maxInterior() ?? 0)}`,
  );

  /** dasharray de un arco que cubre `fraccion` (0–1) de la circunferencia (pathLength = 100). */
  protected arco(fraccion: number): string {
    return `${fraccion * 100} 100`;
  }

  private conUnidad(valor: number, conUnidad = true): string {
    const numero = formatearNumero(valor);
    return conUnidad && this.unidad() ? `${numero} ${this.unidad()}` : numero;
  }
}

function opcionalNumero(valor: unknown): number | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : undefined;
}
