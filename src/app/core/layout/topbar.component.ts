import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { AuthService } from '../services/auth.service';
import { LogoComponent } from './logo.component';
import { CONFIGURACION, MI_PERFIL, RUTA_REGISTRAR_COMIDA, iniciales } from './navegacion';

/**
 * Barra superior (DESIGN.md §5.8): 64 px, sticky, superficie blanca con borde inferior.
 *
 * - Escritorio y tablet: título de la página, badge "Admin" (zona de administración), botón
 *   primario "Registrar comida" y menú del usuario (Mi perfil, Configuración, Cerrar sesión).
 * - Móvil: 56 px con isotipo, título y avatar; el avatar es el botón "Más" que abre el drawer
 *   (emite `abrirMenu`), donde están el resto de secciones y Cerrar sesión.
 */
@Component({
  selector: 'ns-topbar',
  imports: [
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    RouterLink,
    LucideDynamicIcon,
    NsButtonComponent,
    NsBadgeComponent,
    LogoComponent,
  ],
  template: `
    @if (movil()) {
      <ns-logo soloIsotipo [tamano]="28" />
    }
    <h1 class="ns-topbar__titulo">{{ titulo() }}</h1>
    @if (admin()) {
      <ns-badge class="ns-topbar__admin" icon="shield-check">Admin</ns-badge>
    }
    <span class="ns-topbar__hueco"></span>

    @if (movil()) {
      <button
        type="button"
        class="ns-topbar__avatar-boton"
        aria-label="Más: secciones y cuenta"
        aria-haspopup="dialog"
        (click)="abrirMenu.emit()"
      >
        <span class="ns-topbar__avatar" aria-hidden="true">{{ avatar() }}</span>
      </button>
    } @else {
      @if (mostrarRegistrar()) {
        <a nsButton icon="plus" [routerLink]="rutaRegistrar">Registrar comida</a>
      }
      <button
        type="button"
        class="ns-topbar__usuario"
        [cdkMenuTriggerFor]="menuUsuario"
        [attr.aria-label]="'Menú de ' + (cuenta()?.nombre ?? 'usuario')"
      >
        <span class="ns-topbar__avatar" aria-hidden="true">{{ avatar() }}</span>
        <svg lucideIcon="chevron-down" [size]="16" aria-hidden="true"></svg>
      </button>
    }

    <ng-template #menuUsuario>
      <div class="ns-menu" cdkMenu>
        @if (cuenta(); as cuenta) {
          <div class="ns-menu__cabecera">
            <span class="ns-menu__nombre">{{ cuenta.nombre }}</span>
            <span class="ns-menu__email">{{ cuenta.email }}</span>
          </div>
        }
        <a class="ns-menu__item" cdkMenuItem [routerLink]="miPerfil.ruta">
          <svg [lucideIcon]="miPerfil.icono" [size]="18" aria-hidden="true"></svg>
          {{ miPerfil.etiqueta }}
        </a>
        <a class="ns-menu__item" cdkMenuItem [routerLink]="configuracion.ruta">
          <svg [lucideIcon]="configuracion.icono" [size]="18" aria-hidden="true"></svg>
          {{ configuracion.etiqueta }}
        </a>
        <hr class="ns-menu__separador" />
        <button type="button" class="ns-menu__item" cdkMenuItem (cdkMenuItemTriggered)="cerrarSesion()">
          <svg lucideIcon="log-out" [size]="18" aria-hidden="true"></svg>
          Cerrar sesión
        </button>
      </div>
    </ng-template>
  `,
  styleUrl: './topbar.component.scss',
  host: {
    class: 'ns-topbar',
    '[class.ns-topbar--movil]': 'movil()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  readonly titulo = input('');
  /** Zona de administración: muestra el badge "Admin". */
  readonly admin = input(false, { transform: booleanAttribute });
  readonly mostrarRegistrar = input(true, { transform: booleanAttribute });
  /** Versión móvil (56 px, avatar que abre el drawer). */
  readonly movil = input(false, { transform: booleanAttribute });

  /** Móvil: el avatar ("Más") pide abrir el drawer. */
  readonly abrirMenu = output<void>();

  private readonly auth = inject(AuthService);
  protected readonly cuenta = this.auth.cuenta;
  protected readonly avatar = computed(() => iniciales(this.cuenta()?.nombre));
  protected readonly rutaRegistrar = RUTA_REGISTRAR_COMIDA;
  protected readonly miPerfil = MI_PERFIL;
  protected readonly configuracion = CONFIGURACION;

  protected cerrarSesion(): void {
    void this.auth.logout();
  }
}
