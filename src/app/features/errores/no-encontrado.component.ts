import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LogoComponent } from '@core/layout/logo.component';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';

/** 404: cualquier ruta que no existe ('**'). */
@Component({
  selector: 'app-no-encontrado',
  imports: [RouterLink, LogoComponent, NsButtonComponent, NsEmptyStateComponent],
  template: `
    <ns-logo class="ns-error__logo" />
    <main class="ns-error__contenido" id="contenido">
      <ns-empty-state
        icon="search"
        titulo="No encontramos esta página"
        descripcion="Puede que el enlace esté mal escrito o que la página ya no exista."
        [nivelTitulo]="1"
      >
        <a nsButton routerLink="/">Ir al inicio</a>
      </ns-empty-state>
    </main>
  `,
  styleUrl: './pagina-error.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoEncontradoComponent {}
