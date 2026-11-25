import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  computed,
  contentChild,
  inject,
  input,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { NsBadgeComponent } from '../feedback/badge.component';

export type NsCardVariant = 'default' | 'metric' | 'ai' | 'interactive';
export type NsCardPadding = 'sm' | 'md' | 'lg';

/**
 * Tarjeta (DESIGN.md §5.5). Ranuras: título, subtítulo y acciones en la cabecera; el resto del
 * contenido proyectado va al cuerpo. La cabecera solo se pinta si hay título o acciones.
 *
 *   <ns-card variant="ai">
 *     <h2 nsCardTitulo>Sugerencia del asistente</h2>
 *     <p nsCardSubtitulo>Basada en tu última semana</p>
 *     <button nsCardAcciones nsButton variant="ghost" size="sm">Descartar</button>
 *     <p>…</p>
 *   </ns-card>
 *
 * - `ai`: borde ai-100, icono sparkles en ai-600 y badge "IA" en la cabecera (§2.3).
 * - `interactive`: toda la tarjeta es clicable; úsala sobre un <a> o un <button>:
 *     <a nsCard variant="interactive" routerLink="/recetas/12">…</a>
 * - `metric`: el título se muestra como overline (MÉTRICA) sobre la cifra.
 *
 * El nivel del título lo elige quien la usa (h2, h3…) según la jerarquía de la página.
 */
@Component({
  selector: 'ns-card, a[nsCard], button[nsCard]',
  imports: [LucideDynamicIcon, NsBadgeComponent],
  template: `
    @if (titulo() || acciones()) {
      <div class="ns-card__cabecera">
        @if (variant() === 'ai') {
          <svg class="ns-card__icono-ia" lucideIcon="sparkles" [size]="18" aria-hidden="true"></svg>
        }
        <div class="ns-card__titulos">
          <ng-content select="[nsCardTitulo]" />
          <ng-content select="[nsCardSubtitulo]" />
        </div>
        @if (variant() === 'ai') {
          <ns-badge variant="ai">IA</ns-badge>
        }
        <div class="ns-card__acciones">
          <ng-content select="[nsCardAcciones]" />
        </div>
      </div>
    }
    <div class="ns-card__cuerpo"><ng-content /></div>
  `,
  styleUrl: './card.component.scss',
  host: {
    '[class]': 'classes()',
    // Un <button> dentro de un formulario no debe enviarlo por defecto.
    '[attr.type]': 'esBoton ? "button" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsCardComponent {
  readonly variant = input<NsCardVariant>('default');
  /** Relleno interior: sm 16 px, md 20 px (por defecto), lg 24 px. */
  readonly padding = input<NsCardPadding>('md');

  protected readonly esBoton = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'BUTTON';

  protected readonly titulo = contentChild(NsCardTituloDirective);
  protected readonly acciones = contentChild(NsCardAccionesDirective);

  protected readonly classes = computed(() => `ns-card ns-card--${this.variant()} ns-card--padding-${this.padding()}`);
}

/** Título de la tarjeta (estilo card-title; overline en la variante metric). */
@Directive({
  selector: '[nsCardTitulo]',
  host: { '[class]': 'clase()' },
})
export class NsCardTituloDirective {
  private readonly tarjeta = inject(NsCardComponent, { optional: true });
  protected readonly clase = computed(() =>
    this.tarjeta?.variant() === 'metric'
      ? 'ns-card__titulo ns-text-overline ns-text-tertiary'
      : 'ns-card__titulo ns-text-card-title',
  );
}

/** Subtítulo de la tarjeta (body-sm en texto secundario). */
@Directive({
  selector: '[nsCardSubtitulo]',
  host: { class: 'ns-card__subtitulo ns-text-body-sm ns-text-secondary' },
})
export class NsCardSubtituloDirective {}

/** Acciones de la cabecera, alineadas a la derecha (botón ghost o menú). */
@Directive({
  selector: '[nsCardAcciones]',
  host: { class: 'ns-card__accion' },
})
export class NsCardAccionesDirective {}

/** Todo lo necesario para usar la tarjeta en un componente. */
export const NS_CARD = [
  NsCardComponent,
  NsCardTituloDirective,
  NsCardSubtituloDirective,
  NsCardAccionesDirective,
] as const;
