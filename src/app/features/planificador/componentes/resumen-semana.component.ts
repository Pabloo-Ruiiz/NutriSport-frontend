import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import type { MenuResponse } from '@core/models';
import { NumeroPipe } from '@shared/pipes/numero.pipe';
import { NsCardComponent, NsCardTituloDirective } from '@shared/ui/card/card.component';
import { NsDisclaimerComponent } from '@shared/ui/feedback/disclaimer.component';

/**
 * Resumen del menú (DESIGN.md §7.10): media de kcal, % de ajuste al objetivo, proteína media y días
 * de entreno, tal como los da el servidor (`resumen` y `diaEntreno`). Debajo, la explicación del menú
 * en una tarjeta plegable con el aviso orientativo.
 *
 * El menú lo genera un algoritmo de reglas, así que no lleva tratamiento IA; solo la explicación,
 * que la redacta la IA, va en una tarjeta `ai`. Sin explicación, el aviso se muestra solo.
 */
@Component({
  selector: 'app-resumen-semana',
  imports: [LucideDynamicIcon, NsCardComponent, NsCardTituloDirective, NsDisclaimerComponent, NumeroPipe],
  template: `
    <dl class="ns-rs__cifras">
      <div class="ns-rs__cifra">
        <dt>Media planificada</dt>
        <dd>
          <strong>{{ menu().resumen.mediaKcal | numero }}</strong> kcal/día
        </dd>
      </div>
      <div class="ns-rs__cifra">
        <dt>Ajuste al objetivo</dt>
        <dd>
          <strong>{{ menu().resumen.ajustePorcentaje | numero }} %</strong> rango ±10 %
        </dd>
      </div>
      <div class="ns-rs__cifra">
        <dt>Proteína media</dt>
        <dd>
          <strong class="ns-rs__proteina">{{ menu().resumen.proteinaMedia | numero }}</strong> g/día
        </dd>
      </div>
      <div class="ns-rs__cifra">
        <dt>Días de entreno</dt>
        <dd>
          <strong>{{ diasEntreno() }}</strong> {{ diasEntreno() === 1 ? 'día' : 'días' }}
        </dd>
      </div>
    </dl>

    @if (menu().explicacion; as explicacion) {
      <ns-card variant="ai" padding="sm">
        <h3 nsCardTitulo>
          <button
            type="button"
            class="ns-rs__plegar"
            [attr.aria-expanded]="abierta()"
            aria-controls="ns-rs-explicacion"
            (click)="abierta.set(!abierta())"
          >
            Por qué este menú
            <svg
              class="ns-rs__chevron"
              [class.ns-rs__chevron--abierta]="abierta()"
              lucideIcon="chevron-down"
              [size]="18"
              aria-hidden="true"
            ></svg>
          </button>
        </h3>
        <div id="ns-rs-explicacion" class="ns-rs__explicacion" [hidden]="!abierta()">
          <p>{{ explicacion }}</p>
          <ns-disclaimer context="menu" />
        </div>
      </ns-card>
    } @else {
      <ns-disclaimer context="menu" />
    }
  `,
  styles: `
    @use 'abstracts/breakpoints' as bp;

    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
    }
    .ns-rs__cifras {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin: 0;
      border: 1px solid var(--ns-border);
      border-radius: var(--ns-radius-lg);
      background: var(--ns-surface);
      box-shadow: var(--ns-shadow-xs);

      @include bp.up(md) {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }
    .ns-rs__cifra {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-1);
      padding: var(--ns-space-4);

      & + & {
        border-left: 1px solid var(--ns-border);
      }
      @include bp.down(md) {
        &:nth-child(3) {
          border-left: 0;
        }
        &:nth-child(n + 3) {
          border-top: 1px solid var(--ns-border);
        }
      }
    }
    dt {
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    dd {
      margin: 0;
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
      font-variant-numeric: tabular-nums;
    }
    dd strong {
      color: var(--ns-text);
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 2rem;
    }
    dd strong.ns-rs__proteina {
      color: var(--ns-data-protein-text);
    }
    .ns-rs__plegar {
      display: inline-flex;
      align-items: center;
      gap: var(--ns-space-2);
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;

      &:focus-visible {
        border-radius: var(--ns-radius-xs);
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
    }
    .ns-rs__chevron {
      transition: transform var(--ns-duration-fast) var(--ns-ease-out);
    }
    .ns-rs__chevron--abierta {
      transform: rotate(180deg);
    }
    .ns-rs__explicacion {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);

      &[hidden] {
        display: none;
      }
      p {
        margin: 0;
        white-space: pre-line;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumenSemanaComponent {
  readonly menu = input.required<MenuResponse>();

  protected readonly abierta = signal(false);
  protected readonly diasEntreno = computed(() => this.menu().dias.filter((d) => d.diaEntreno).length);
}
