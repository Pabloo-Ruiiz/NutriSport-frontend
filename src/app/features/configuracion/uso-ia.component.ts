import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AuthService } from '@core/services/auth.service';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsDisclaimerComponent } from '@shared/ui/feedback/disclaimer.component';
import { ReenviarVerificacionComponent } from '../auth/componentes/reenviar-verificacion.component';

/** Límites diarios de la IA (NutriSport_API.md §2.3). */
export const LIMITES_IA = [
  { icono: 'camera', nombre: 'Análisis de fotos', limite: 20, unidad: 'análisis al día' },
  { icono: 'bot', nombre: 'Mensajes al asistente', limite: 50, unidad: 'mensajes al día' },
] as const;

/**
 * Configuración › Uso de IA (DESIGN.md §7.16). La API no tiene endpoint de uso diario (Annex B de
 * la guía, NutriSport_API.md §11.7): se muestran los límites, no lo gastado hoy; al llegar al
 * límite, cada función avisa con el 429 y su tiempo de espera. También si el email está
 * verificado, que es requisito de la IA (§4).
 */
@Component({
  selector: 'app-uso-ia',
  imports: [NsBadgeComponent, NsDisclaimerComponent, ReenviarVerificacionComponent],
  template: `
    <h2 class="ns-text-h3 ns-seccion__titulo">Uso de IA</h2>

    <section class="ns-bloque" aria-labelledby="ns-limites-titulo">
      <div class="ns-bloque__cabecera"><h3 class="ns-text-h4" id="ns-limites-titulo">Límites diarios</h3></div>
      <ul class="ns-bloque__lista" role="list">
        @for (l of limites; track l.nombre) {
          <li class="ns-bloque__dato">
            <span>{{ l.nombre }}</span>
            <strong class="ns-tnum">{{ l.limite }} {{ l.unidad }}</strong>
          </li>
        }
      </ul>
      <p class="ns-bloque__nota">
        Todavía no podemos mostrarte cuántos llevas hoy. Si llegas al límite, te diremos cuánto falta para poder seguir.
      </p>
    </section>

    <section class="ns-bloque" aria-labelledby="ns-requisitos-titulo">
      <div class="ns-bloque__cabecera">
        <h3 class="ns-text-h4" id="ns-requisitos-titulo">Email verificado</h3>
        @if (verificado()) {
          <ns-badge variant="success" icon="circle-check">Verificado</ns-badge>
        } @else {
          <ns-badge variant="warning" icon="triangle-exclamation-point">Sin verificar</ns-badge>
        }
      </div>
      @if (verificado()) {
        <p class="ns-bloque__texto">Puedes usar el análisis de fotos y el asistente.</p>
      } @else {
        <p class="ns-bloque__texto">
          Para usar el análisis de fotos y el asistente tienes que verificar tu email. Abre el enlace que te enviamos o
          pide uno nuevo.
        </p>
        <app-reenviar-verificacion [email]="email()" textoBoton="Reenviar correo de verificación" />
      }
    </section>

    <ns-disclaimer context="ia" />
  `,
  styleUrl: './secciones.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsoIaComponent {
  private readonly auth = inject(AuthService);

  protected readonly limites = LIMITES_IA;
  protected readonly verificado = this.auth.emailVerificado;
  protected readonly email = computed(() => this.auth.cuenta()?.email ?? null);
}
