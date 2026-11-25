import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { ReenviarVerificacionComponent } from '../componentes/reenviar-verificacion.component';
import type { EstadoRevisaEmail } from './registro.component';

/**
 * "Revisa tu email" tras el registro (DESIGN.md §7.2). El texto es siempre el mismo, exista o no
 * la cuenta (NutriSport_API.md §2.4). "Reenviar" usa el email del estado de navegación; si no lo
 * hay (se ha recargado la página o se ha llegado por un enlace), se pide.
 */
@Component({
  selector: 'app-revisa-tu-email',
  imports: [RouterLink, NsEmptyStateComponent, ReenviarVerificacionComponent],
  template: `
    <ns-empty-state
      icon="mail-check"
      titulo="Revisa tu email"
      descripcion="Si los datos son correctos, te hemos enviado un enlace para verificar tu cuenta. Caduca en 24 horas."
      [nivelTitulo]="1"
    >
      <div class="ns-auth-estado__acciones">
        <app-reenviar-verificacion
          [email]="email"
          ayuda="Escribe el email con el que te registraste para reenviar el enlace."
        />
        <a class="ns-auth-form__enlace" routerLink="/login">Ir a iniciar sesión</a>
      </div>
    </ns-empty-state>
  `,
  styleUrl: '../auth-formulario.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevisaTuEmailComponent {
  private readonly estado = inject(Location).getState() as Partial<EstadoRevisaEmail> | null;
  protected readonly email = typeof this.estado?.email === 'string' && this.estado.email ? this.estado.email : null;
}
