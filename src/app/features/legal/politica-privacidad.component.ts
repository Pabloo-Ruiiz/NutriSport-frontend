import { httpResource } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LogoComponent } from '@core/layout/logo.component';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { markdownAHtml, titulosDe } from './markdown';

/** Única fuente del texto: el mismo Markdown que se versiona con el proyecto. */
export const URL_POLITICA_PRIVACIDAD = 'legal/POLITICA_DE_PRIVACIDAD.md';

/**
 * Política de privacidad (/politica-de-privacidad): pública, con o sin sesión. Pinta
 * public/legal/POLITICA_DE_PRIVACIDAD.md con la identidad del login (superficie verde oscura e
 * isotipo como marca de agua) y un índice lateral en escritorio. El registro la enlaza en una pestaña nueva para no perder el formulario.
 */
@Component({
  selector: 'app-politica-privacidad',
  imports: [RouterLink, LogoComponent, NsButtonComponent, NsAlertComponent],
  template: `
    <img class="ns-legal__marca-agua" src="marca/logo-watermark.svg" alt="" aria-hidden="true" />
    <header class="ns-legal__cabecera">
      <a class="ns-legal__inicio" routerLink="/login" aria-label="NutriSport AI">
        <ns-logo negativo [tamano]="32" />
      </a>
      <nav class="ns-legal__nav" aria-label="Cuenta">
        <a class="ns-legal__enlace" routerLink="/login">Iniciar sesión</a>
        <a nsButton size="sm" routerLink="/registro">Crear cuenta</a>
      </nav>
    </header>

    <main class="ns-legal__main" id="contenido">
      <div class="ns-legal__cuerpo">
        @if (indice().length) {
          <nav class="ns-legal__indice" aria-labelledby="ns-legal-indice">
            <p class="ns-legal__indice-titulo" id="ns-legal-indice">Contenido</p>
            <ol class="ns-legal__indice-lista" role="list">
              @for (titulo of indice(); track titulo.id) {
                <li>
                  <button type="button" class="ns-legal__indice-enlace" (click)="irA(titulo.id)">
                    {{ titulo.texto }}
                  </button>
                </li>
              }
            </ol>
          </nav>
        }

        <article class="ns-legal__documento" [attr.aria-busy]="texto.isLoading()">
          @if (texto.error()) {
            <h1>Política de privacidad</h1>
            <ns-alert type="error">No hemos podido cargar la política de privacidad. Recarga la página.</ns-alert>
          } @else if (html(); as html) {
            <div class="ns-legal__contenido" [innerHTML]="html"></div>
          } @else {
            <p class="ns-legal__cargando">Cargando la política de privacidad…</p>
          }
        </article>
      </div>
    </main>

    <footer class="ns-legal__pie">
      <span>© 2026 NutriSport AI · Proyecto académico</span>
      <a class="ns-legal__enlace" routerLink="/registro">Volver al registro</a>
    </footer>
  `,
  styleUrl: './politica-privacidad.component.scss',
  // El HTML del documento llega por [innerHTML]: los estilos van sin encapsular, bajo .ns-legal.
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ns-legal' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoliticaPrivacidadComponent {
  private readonly documento = inject(DOCUMENT);

  protected readonly texto = httpResource.text(() => URL_POLITICA_PRIVACIDAD);
  private readonly markdown = computed(() => (this.texto.hasValue() ? this.texto.value() : null));
  protected readonly html = computed(() => {
    const md = this.markdown();
    return md ? markdownAHtml(md) : null;
  });
  protected readonly indice = computed(() => titulosDe(this.markdown() ?? ''));

  /**
   * Índice con botones y no con enlaces "#id": con <base href="/"> un "#id" navegaría a "/#id".
   * Lleva el foco al título para que el lector de pantalla siga desde ahí.
   */
  protected irA(id: string): void {
    const titulo = this.documento.getElementById(id);
    if (!titulo) return;
    const reducir = this.documento.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    titulo.setAttribute('tabindex', '-1');
    titulo.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
    titulo.focus({ preventScroll: true });
  }
}
