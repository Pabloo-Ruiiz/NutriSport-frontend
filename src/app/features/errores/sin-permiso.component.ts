import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LogoComponent } from '@core/layout/logo.component';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';

/** Destino de adminGuard cuando el usuario no tiene el rol necesario. */
@Component({
  selector: 'app-sin-permiso',
  imports: [RouterLink, LogoComponent, NsButtonComponent, NsEmptyStateComponent],
  template: `
    <ns-logo class="ns-error__logo" />
    <main class="ns-error__contenido" id="contenido">
      <ns-empty-state
        icon="lock"
        titulo="No tienes permiso"
        descripcion="Esta sección es solo para la administración de NutriSport AI."
        [nivelTitulo]="1"
      >
        <a nsButton routerLink="/">Volver al inicio</a>
      </ns-empty-state>
    </main>
  `,
  styleUrl: './pagina-error.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SinPermisoComponent {}
