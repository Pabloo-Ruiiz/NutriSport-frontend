import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type NsSkeletonShape = 'line' | 'circle' | 'rect';

/** Medidas por defecto de cada forma. */
const MEDIDAS: Record<NsSkeletonShape, { width: string; height: string }> = {
  line: { width: '100%', height: '0.875rem' },
  circle: { width: '40px', height: '40px' },
  rect: { width: '100%', height: '80px' },
};

/**
 * Bloque de carga con la forma del contenido final (DESIGN.md §5.15): surface-muted con un brillo
 * de 1,4 s que desaparece con prefers-reduced-motion.
 *
 *   <div aria-busy="true" aria-label="Cargando comidas">
 *     <ns-skeleton shape="circle" />
 *     <ns-skeleton width="60%" />
 *     <ns-skeleton shape="rect" [height]="120" />
 *   </div>
 *
 * Es decorativo (aria-hidden): el contenedor es quien anuncia la carga con aria-busy.
 * `width` y `height` aceptan números (px) o cualquier medida CSS ("60%", "2rem").
 * En un círculo, si solo se indica `width`, el alto es el mismo.
 */
@Component({
  selector: 'ns-skeleton',
  template: '',
  styleUrl: './skeleton.component.scss',
  host: {
    '[class]': '"ns-skeleton ns-skeleton--" + shape()',
    '[style.width]': 'ancho()',
    '[style.height]': 'alto()',
    'aria-hidden': 'true',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsSkeletonComponent {
  readonly shape = input<NsSkeletonShape>('line');
  readonly width = input<string | number>();
  readonly height = input<string | number>();

  protected readonly ancho = computed(() => medida(this.width()) ?? MEDIDAS[this.shape()].width);
  protected readonly alto = computed(
    () =>
      medida(this.height()) ??
      (this.shape() === 'circle' ? medida(this.width()) : undefined) ??
      MEDIDAS[this.shape()].height,
  );
}

function medida(valor: string | number | undefined): string | undefined {
  if (valor === undefined || valor === '') return undefined;
  return typeof valor === 'number' || /^\d+(\.\d+)?$/.test(valor) ? `${valor}px` : valor;
}
