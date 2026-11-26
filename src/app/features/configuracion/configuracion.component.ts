import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { filter, map } from 'rxjs';

import { LayoutService } from '@core/layout/layout.service';

interface Seccion {
  ruta: string;
  etiqueta: string;
  descripcion: string;
  icono: string;
}

export const SECCIONES_CONFIGURACION: readonly Seccion[] = [
  { ruta: 'cuenta', etiqueta: 'Cuenta', descripcion: 'Nombre, unidades y patrones detectados', icono: 'user' },
  { ruta: 'seguridad', etiqueta: 'Seguridad', descripcion: 'Contraseña, email y sesiones', icono: 'lock' },
  {
    ruta: 'privacidad',
    etiqueta: 'Privacidad y datos',
    descripcion: 'Consentimiento de salud y eliminar la cuenta',
    icono: 'shield-check',
  },
  {
    ruta: 'uso-ia',
    etiqueta: 'Uso de IA',
    descripcion: 'Límites diarios del análisis y el asistente',
    icono: 'sparkles',
  },
];

/**
 * Configuración (DESIGN.md §7.16): navegación secundaria a la izquierda y la sección a la derecha.
 * En móvil, /configuracion es la lista de secciones y cada una se abre en su propia pantalla con
 * "Volver a Configuración".
 */
@Component({
  selector: 'app-configuracion',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideDynamicIcon],
  template: `
    @if (layout.esMovil()) {
      @if (enIndice()) {
        <nav aria-label="Secciones de configuración">
          <ul class="ns-config__lista" role="list">
            @for (s of secciones; track s.ruta) {
              <li>
                <a class="ns-config__fila" [routerLink]="s.ruta">
                  <svg class="ns-config__icono" [lucideIcon]="s.icono" [size]="20" aria-hidden="true"></svg>
                  <span class="ns-config__textos">
                    <span class="ns-config__etiqueta">{{ s.etiqueta }}</span>
                    <span class="ns-config__descripcion">{{ s.descripcion }}</span>
                  </span>
                  <svg lucideIcon="chevron-right" [size]="18" aria-hidden="true"></svg>
                </a>
              </li>
            }
          </ul>
        </nav>
      } @else {
        <a class="ns-config__volver" routerLink="/configuracion">
          <svg lucideIcon="chevron-left" [size]="18" aria-hidden="true"></svg>
          Volver a Configuración
        </a>
      }
      <router-outlet />
    } @else {
      <div class="ns-config">
        <nav class="ns-config__nav" aria-label="Secciones de configuración">
          <ul class="ns-config__menu" role="list">
            @for (s of secciones; track s.ruta) {
              <li>
                <a
                  class="ns-config__enlace"
                  [routerLink]="s.ruta"
                  routerLinkActive="ns-config__enlace--activo"
                  ariaCurrentWhenActive="page"
                >
                  <svg [lucideIcon]="s.icono" [size]="18" aria-hidden="true"></svg>
                  {{ s.etiqueta }}
                </a>
              </li>
            }
          </ul>
        </nav>
        <div class="ns-config__contenido"><router-outlet /></div>
      </div>
    }
  `,
  styleUrl: './configuracion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionComponent {
  protected readonly layout = inject(LayoutService);
  private readonly router = inject(Router);

  protected readonly secciones = SECCIONES_CONFIGURACION;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  /** En /configuracion sin sección (solo ocurre en móvil). */
  protected readonly enIndice = computed(() => this.url().split(/[?#]/)[0].replace(/\/$/, '') === '/configuracion');
}
