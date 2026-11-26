import { ChangeDetectionStrategy, Component, input, numberAttribute } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { type ApiError, estadoHttp } from '../util/api-error';

/** Ruta donde se vuelve a dar el consentimiento de datos de salud. */
export const RUTA_PRIVACIDAD = '/configuracion/privacidad';

/** 403 CONSENTIMIENTO_REVOCADO (NutriSport_API.md §3.1). */
export function esConsentimientoRevocado(error: ApiError | unknown): boolean {
  return (
    estadoHttp(error) === 403 &&
    typeof (error as ApiError)?.esCodigo === 'function' &&
    (error as ApiError).esCodigo('CONSENTIMIENTO_REVOCADO')
  );
}

/**
 * Estado vacío de las pantallas con datos de salud cuando responden 403 CONSENTIMIENTO_REVOCADO
 * (perfil, comidas, análisis, entrenamientos, seguimiento), con el enlace a Privacidad.
 *
 *   @if (consentimientoRevocado()) { <ns-consentimiento-revocado /> } @else { … }
 */
@Component({
  selector: 'ns-consentimiento-revocado',
  imports: [RouterLink, NsButtonComponent, NsEmptyStateComponent],
  template: `
    <ns-empty-state
      icon="lock"
      titulo="Tus datos de salud están bloqueados"
      descripcion="Has revocado el consentimiento de datos de salud. Tus datos siguen guardados: vuelve a darlo para usar esta sección."
      [nivelTitulo]="nivelTitulo()"
    >
      <a nsButton [routerLink]="rutaPrivacidad">Ir a Privacidad</a>
    </ns-empty-state>
  `,
  styles: `
    :host {
      display: block;
      padding: var(--ns-space-8) 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsentimientoRevocadoComponent {
  readonly nivelTitulo = input(2, { transform: numberAttribute });
  protected readonly rutaPrivacidad = RUTA_PRIVACIDAD;
}
