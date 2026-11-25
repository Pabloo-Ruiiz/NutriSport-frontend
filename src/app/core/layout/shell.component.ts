import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { NsDrawerComponent } from '@shared/ui/overlay/drawer.component';
import { AuthService } from '../services/auth.service';
import { BottomNavComponent } from './bottom-nav.component';
import { LayoutService } from './layout.service';
import { NavListaComponent } from './nav-lista.component';
import { gruposDrawer, gruposVisibles } from './navegacion';
import { SidebarComponent } from './sidebar.component';
import { tituloPagina } from './titulo-pagina';
import { TopbarComponent } from './topbar.component';

export type ModoShell = 'deportista' | 'admin';

/**
 * Estructura de la aplicación con sesión (DESIGN.md §6.1, §6.3, §6.4 y §9.6).
 *
 * - Escritorio (≥ 1024 px): sidebar de 248 px fija + topbar de 64 px sticky + contenido.
 * - Tablet (768–1023 px): sidebar colapsada a 72 px, solo iconos.
 * - Móvil (< 768 px): sin sidebar; topbar de 56 px, barra inferior con el botón "Registrar" y
 *   drawer de 300 px (desde el avatar, "Más") con el resto de secciones y Cerrar sesión.
 *
 * Modo `admin` (AdminLayoutComponent): franja superior de 3 px ai-600, badge "Admin" en la
 * topbar, sin "Registrar comida" ni barra inferior (la zona está pensada para escritorio; en
 * móvil se navega con el drawer).
 *
 * Los grupos de la sidebar se filtran con AuthService.esAdmin().
 */
@Component({
  selector: 'ns-shell',
  imports: [
    RouterOutlet,
    LucideDynamicIcon,
    NsDrawerComponent,
    SidebarComponent,
    TopbarComponent,
    BottomNavComponent,
    NavListaComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  host: {
    class: 'ns-shell',
    '[class.ns-shell--movil]': 'layout.esMovil()',
    '[class.ns-shell--colapsada]': 'layout.esTablet()',
    '[class.ns-shell--admin]': 'esModoAdmin()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  readonly modo = input<ModoShell>('deportista');

  protected readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);

  protected readonly esModoAdmin = computed(() => this.modo() === 'admin');
  protected readonly grupos = computed(() => gruposVisibles(this.auth.esAdmin()));
  /** En el drawer: lo que no está en la barra inferior (en modo admin no hay barra: todo). */
  protected readonly gruposDrawer = computed(() =>
    this.esModoAdmin() ? this.grupos() : gruposDrawer(this.auth.esAdmin()),
  );
  protected readonly inicio = computed(() => (this.esModoAdmin() ? '/admin/usuarios' : '/inicio'));
  protected readonly titulo = tituloPagina();
  protected readonly cuenta = this.auth.cuenta;

  protected readonly drawerAbierto = signal(false);

  /** "Saltar al contenido": mueve el foco al <main> sin pasar por el router. */
  protected saltarAlContenido(evento: Event, main: HTMLElement): void {
    evento.preventDefault();
    main.focus();
  }

  protected cerrarSesion(): void {
    this.drawerAbierto.set(false);
    void this.auth.logout();
  }
}
