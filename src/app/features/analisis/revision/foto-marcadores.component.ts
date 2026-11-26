import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';

/** Estado de la foto: la URL prefirmada caduca en minutos y la foto se borra a los 90 días. */
export type EstadoFoto = 'cargando' | 'lista' | 'no-disponible' | 'error';

export interface Marcador {
  numero: number;
  nombre: string;
}

/**
 * Foto del análisis con etiquetas numeradas (DESIGN.md §7.8). El backend no da la posición de cada
 * alimento en la imagen, así que las etiquetas van en una columna sobre el borde izquierdo. Cada
 * una es un botón que lleva a su fila de la lista (`elegido` con el índice); `resaltado` marca la
 * de la fila que tiene el foco o el ratón.
 *
 *   <app-foto-marcadores [url]="url()" [estado]="estadoFoto()" [marcadores]="marcadores()"
 *                        [resaltado]="resaltado()" (elegido)="irAFila($event)" />
 */
@Component({
  selector: 'app-foto-marcadores',
  imports: [LucideDynamicIcon, NsSkeletonComponent],
  template: `
    <div class="ns-marcadores__foto">
      @switch (estado()) {
        @case ('lista') {
          <img class="ns-marcadores__imagen" [src]="url()" alt="Foto del plato analizado" />
        }
        @case ('cargando') {
          <ns-skeleton class="ns-marcadores__hueco" shape="rect" width="100%" height="100%" />
        }
        @default {
          <div class="ns-marcadores__hueco ns-marcadores__vacia">
            <svg lucideIcon="image" [size]="28" aria-hidden="true"></svg>
            <p>
              {{ estado() === 'no-disponible' ? 'La foto ya no está disponible' : 'No hemos podido cargar la foto' }}
            </p>
          </div>
        }
      }

      @if (marcadores().length) {
        <ol class="ns-marcadores__lista" aria-label="Alimentos de la foto">
          @for (m of marcadores(); track m.numero; let i = $index) {
            <li>
              <button
                type="button"
                class="ns-marcadores__marca"
                [class.ns-marcadores__marca--resaltada]="resaltado() === i"
                [attr.aria-label]="'Ir al alimento ' + m.numero + ': ' + m.nombre"
                [attr.title]="m.nombre"
                (click)="elegido.emit(i)"
              >
                {{ m.numero }}
              </button>
            </li>
          }
        </ol>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .ns-marcadores__foto {
      position: relative;
      overflow: hidden;
      border-radius: var(--ns-radius-lg);
      background: var(--ns-surface-sunken);
      aspect-ratio: 4 / 3;
    }
    :host(.ns-marcadores--compacta) .ns-marcadores__foto {
      height: 240px;
      aspect-ratio: auto;
    }
    .ns-marcadores__imagen,
    .ns-marcadores__hueco {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .ns-marcadores__vacia {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--ns-space-2);
      color: var(--ns-text-secondary);

      p {
        margin: 0;
        font-size: 0.875rem;
      }
    }
    .ns-marcadores__lista {
      position: absolute;
      top: var(--ns-space-3);
      bottom: var(--ns-space-3);
      left: var(--ns-space-3);
      display: flex;
      flex-direction: column;
      flex-wrap: wrap;
      gap: var(--ns-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-marcadores__marca {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 2px solid var(--ns-gray-0);
      border-radius: var(--ns-radius-full);
      background: var(--ns-action-ai);
      color: var(--ns-text-inverse);
      font: 700 0.875rem/1 var(--ns-font-body);
      box-shadow: var(--ns-shadow-md);
      cursor: pointer;
      transition: transform 150ms ease-out;

      &:hover,
      &.ns-marcadores__marca--resaltada {
        background: var(--ns-action-ai-hover);
        transform: scale(1.12);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .ns-marcadores__marca {
        transition: none;
      }
    }
  `,
  host: { '[class.ns-marcadores--compacta]': 'compacta()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FotoMarcadoresComponent {
  readonly url = input<string | null>(null);
  readonly estado = input<EstadoFoto>('cargando');
  readonly marcadores = input<readonly Marcador[]>([]);
  /** Índice del marcador resaltado, o null. */
  readonly resaltado = input<number | null>(null);
  /** Altura fija de 240 px (móvil). */
  readonly compacta = input(false);

  /** Índice del marcador pulsado. */
  readonly elegido = output<number>();
}
