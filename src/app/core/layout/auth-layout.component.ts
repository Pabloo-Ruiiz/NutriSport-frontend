import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { LogoComponent } from './logo.component';

/** Beneficios del panel de marca (login, registro, recuperar contraseña). */
export const BENEFICIOS = [
  {
    icono: 'camera',
    titulo: 'Registra con una foto',
    texto: 'La IA estima los alimentos y las cantidades de tu plato; tú confirmas.',
  },
  {
    icono: 'activity',
    titulo: 'Objetivos que siguen tu entrenamiento',
    texto: 'Energía y macros ajustados a tu deporte y a cada sesión.',
  },
  {
    icono: 'shield-check',
    titulo: 'Tus datos, protegidos',
    texto: 'Datos de salud con tu consentimiento; puedes exportarlos o borrarlos.',
  },
] as const;

/**
 * Pantallas públicas (DESIGN.md §7.1): split con el panel de marca a la izquierda (superficie verde
 * oscura con degradado, isotipo como marca de agua, eslogan y tres beneficios) y el formulario a la derecha,
 * en una tarjeta (máx. 440 px).
 * Por debajo de 1024 px el panel se reduce a una cabecera de 120 px con el logotipo.
 */
@Component({
  selector: 'ns-auth-layout',
  imports: [RouterOutlet, LucideDynamicIcon, LogoComponent],
  template: `
    <aside class="ns-auth__marca">
      <img class="ns-auth__marca-agua" src="marca/logo-watermark.svg" alt="" aria-hidden="true" />
      <ns-logo negativo [tamano]="36" />
      <div class="ns-auth__mensaje">
        <p class="ns-auth__etiqueta">
          <svg lucideIcon="sparkles" [size]="14" aria-hidden="true"></svg>
          Nutrición deportiva con IA
        </p>
        <p class="ns-auth__eslogan">
          Tu nutrición deportiva, impulsada por <span class="ns-auth__eslogan-destacado">inteligencia artificial</span>
        </p>
        <ul class="ns-auth__beneficios" role="list">
          @for (beneficio of beneficios; track beneficio.icono) {
            <li class="ns-auth__beneficio">
              <span class="ns-auth__beneficio-icono" aria-hidden="true">
                <svg [lucideIcon]="beneficio.icono" [size]="20"></svg>
              </span>
              <span>
                <strong class="ns-auth__beneficio-titulo">{{ beneficio.titulo }}</strong>
                <span class="ns-auth__beneficio-texto">{{ beneficio.texto }}</span>
              </span>
            </li>
          }
        </ul>
      </div>
      <p class="ns-auth__pie">© NutriSport AI · Nutrición de precisión para deportistas</p>
    </aside>
    <main class="ns-auth__contenido" id="contenido">
      <div class="ns-auth__formulario">
        <router-outlet />
      </div>
    </main>
  `,
  styleUrl: './auth-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {
  protected readonly beneficios = BENEFICIOS;
}
