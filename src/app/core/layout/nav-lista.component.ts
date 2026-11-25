import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import type { GrupoNav } from './navegacion';

/**
 * Grupos de enlaces con el estilo de la sidebar (DESIGN.md §5.7), sobre ink-950. Lo usan la
 * sidebar y el drawer móvil.
 *
 * El enlace activo se marca con fondo, texto blanco e indicador vertical de 3 px green-400 (no
 * solo con color) y lleva aria-current="page". Colapsada, solo se ven los iconos: el nombre sigue
 * siendo el texto accesible del enlace y aparece como tooltip al pasar el ratón o con el foco.
 */
@Component({
  selector: 'ns-nav-lista',
  imports: [RouterLink, RouterLinkActive, LucideDynamicIcon],
  template: `
    @for (grupo of grupos(); track grupo.titulo) {
      <section class="ns-nav__grupo" [attr.aria-labelledby]="colapsada() ? null : idGrupo(grupo)">
        @if (colapsada()) {
          <span class="ns-nav__separador" aria-hidden="true"></span>
        } @else {
          <h2 class="ns-nav__titulo ns-text-overline" [id]="idGrupo(grupo)">{{ grupo.titulo }}</h2>
        }
        <ul class="ns-nav__lista" role="list">
          @for (elemento of grupo.elementos; track elemento.ruta) {
            <li>
              <a
                class="ns-nav__enlace"
                [routerLink]="elemento.ruta"
                routerLinkActive="ns-nav__enlace--activo"
                ariaCurrentWhenActive="page"
                [routerLinkActiveOptions]="{ exact: elemento.exacta ?? false }"
                [attr.data-tooltip]="colapsada() ? elemento.etiqueta : null"
              >
                <svg class="ns-nav__icono" [lucideIcon]="elemento.icono" [size]="20" aria-hidden="true"></svg>
                <span class="ns-nav__etiqueta">{{ elemento.etiqueta }}</span>
              </a>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styleUrl: './nav-lista.component.scss',
  host: {
    class: 'ns-nav',
    '[class.ns-nav--colapsada]': 'colapsada()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavListaComponent {
  readonly grupos = input.required<readonly GrupoNav[]>();
  /** Solo iconos (sidebar de 72 px en tablet). */
  readonly colapsada = input(false, { transform: booleanAttribute });
  /** Prefijo de los id de los títulos (hay dos listas a la vez: sidebar y drawer). */
  readonly prefijo = input('ns-nav');

  protected idGrupo(grupo: GrupoNav): string {
    return `${this.prefijo()}-${grupo.titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z]/g, '')}`;
  }
}
