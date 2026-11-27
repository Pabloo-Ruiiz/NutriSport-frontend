import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { AuthService } from '@core/services/auth.service';
import { SeguimientoService } from '@core/services/seguimiento.service';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsInsightCardComponent } from '@shared/ui/data/insight-card.component';

/**
 * "Patrón detectado" del dashboard (DESIGN.md §7.4 y §7.14): el insight más reciente (la API los da
 * ya ordenados) en una tarjeta `ai`. Solo pide los insights si el usuario los tiene activos y solo
 * se pinta si hay alguno: si no, el host queda oculto y no ocupa hueco en la rejilla.
 */
@Component({
  selector: 'app-patron-detectado',
  imports: [NS_CARD, NsInsightCardComponent, RouterLink],
  template: `
    @if (insight(); as i) {
      <ns-card variant="ai">
        <h3 nsCardTitulo>Patrón detectado</h3>
        <a nsCardAcciones class="ns-patron__enlace" routerLink="/estadisticas">Ver todos</a>
        <ns-insight-card [insight]="i" [nivelTitulo]="4" />
      </ns-card>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    :host([hidden]) {
      display: none;
    }
    .ns-patron__enlace {
      color: var(--ns-text-link);
      font: 600 0.875rem/1.25rem var(--ns-font-body);
    }
  `,
  host: { '[hidden]': '!insight()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatronDetectadoComponent {
  private readonly seguimiento = inject(SeguimientoService);
  private readonly auth = inject(AuthService);

  private readonly insights = rxResource({
    params: () => (this.auth.cuenta()?.insightsActivos ? true : undefined),
    stream: () => this.seguimiento.insights(),
  });
  protected readonly insight = computed(() => (this.insights.hasValue() ? (this.insights.value()[0] ?? null) : null));
}
