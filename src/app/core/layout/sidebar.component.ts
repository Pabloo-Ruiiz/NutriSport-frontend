import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { LogoComponent } from './logo.component';
import { NavListaComponent } from './nav-lista.component';
import { type GrupoNav, iniciales } from './navegacion';

/**
 * Sidebar "cabina" (DESIGN.md §5.7): ink-950, 248 px; colapsada a 72 px (tablet) solo con
 * iconos. Arriba el logotipo negativo (64 px), en medio los grupos y abajo el usuario.
 * El menú del usuario (perfil, configuración, cerrar sesión) está en la topbar.
 */
@Component({
  selector: 'ns-sidebar',
  imports: [RouterLink, LogoComponent, NavListaComponent],
  template: `
    <a class="ns-sidebar__marca" [routerLink]="inicio()" aria-label="NutriSport AI, ir al inicio">
      <ns-logo negativo [soloIsotipo]="colapsada()" />
    </a>
    <nav class="ns-sidebar__nav" aria-label="Principal">
      <ns-nav-lista [grupos]="grupos()" [colapsada]="colapsada()" prefijo="ns-sidebar" />
    </nav>
    @if (cuenta(); as cuenta) {
      <div class="ns-sidebar__usuario">
        <span class="ns-sidebar__avatar" aria-hidden="true">{{ avatar() }}</span>
        <span class="ns-sidebar__datos" [class.ns-sr-only]="colapsada()">
          <span class="ns-sidebar__nombre">{{ cuenta.nombre }}</span>
          <span class="ns-sidebar__email">{{ cuenta.email }}</span>
        </span>
      </div>
    }
  `,
  styleUrl: './sidebar.component.scss',
  host: {
    class: 'ns-sidebar',
    '[class.ns-sidebar--colapsada]': 'colapsada()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly grupos = input.required<readonly GrupoNav[]>();
  readonly colapsada = input(false, { transform: booleanAttribute });
  /** Destino del logotipo. */
  readonly inicio = input('/inicio');

  protected readonly cuenta = inject(AuthService).cuenta;
  protected readonly avatar = computed(() => iniciales(this.cuenta()?.nombre));
}
