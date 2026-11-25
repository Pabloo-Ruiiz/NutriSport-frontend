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
 * Pantallas públicas (DESIGN.md §7.1): split 50/50 con el panel de marca ink-950 a la izquierda
 * (logotipo negativo, eslogan y tres beneficios) y el formulario a la derecha (máx. 400 px).
 * Por debajo de 1024 px el panel se reduce a una cabecera de 120 px con el logotipo.
 */
@Component({
  selector: 'ns-auth-layout',
  imports: [RouterOutlet, LucideDynamicIcon, LogoComponent],
  template: `
    <aside class="ns-auth__marca">
      <ns-logo negativo [tamano]="36" />
      <div class="ns-auth__mensaje">
        <p class="ns-auth__eslogan">Tu nutrición deportiva, impulsada por inteligencia artificial</p>
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
