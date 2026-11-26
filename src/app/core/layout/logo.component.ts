import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

/**
 * Logotipo (DESIGN.md §1.5): isotipo (public/marca/logo-mark.svg) + "NutriSport" en Manrope 800 +
 * píldora "AI" en índigo. El texto va en HTML y no dentro del SVG para usar la fuente de la app
 * (un <img> SVG no carga fuentes web).
 *
 *   <ns-logo negativo />          sobre ink-950 (sidebar, panel de marca)
 *   <ns-logo soloIsotipo />       topbar móvil, sidebar colapsada
 */
@Component({
  selector: 'ns-logo',
  template: `
    <img class="ns-logo__isotipo" src="marca/logo-mark.svg" alt="" [width]="tamano()" [height]="tamano()" />
    @if (soloIsotipo()) {
      <span class="ns-sr-only">NutriSport AI</span>
    } @else {
      <span class="ns-logo__texto">NutriSport</span>
      <span class="ns-logo__ai">AI</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--ns-space-2);
      color: var(--ns-text);
      line-height: 1;
    }
    :host(.ns-logo--negativo) {
      color: var(--ns-text-inverse);
    }
    .ns-logo__isotipo {
      flex-shrink: 0;
      border-radius: 25%;
    }
    :host(.ns-logo--negativo) .ns-logo__isotipo {
      box-shadow: 0 0 0 1px var(--ns-ink-800);
    }
    .ns-logo__texto {
      font-family: var(--ns-font-display);
      font-size: 1.125rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .ns-logo__ai {
      padding: 3px 7px;
      border-radius: var(--ns-radius-full);
      background: var(--ns-gradient-ai);
      color: var(--ns-text-inverse);
      font-size: 0.75rem;
      font-weight: 700;
    }
  `,
  host: {
    class: 'ns-logo',
    '[class.ns-logo--negativo]': 'negativo()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {
  /** Versión para fondos oscuros (texto blanco). */
  readonly negativo = input(false, { transform: booleanAttribute });
  /** Solo el isotipo; el nombre queda para lectores de pantalla. */
  readonly soloIsotipo = input(false, { transform: booleanAttribute });
  /** Lado del isotipo en px. */
  readonly tamano = input(28);
}
