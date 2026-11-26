import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injector, afterNextRender, inject } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

/** Ruta sin query params ni fragmento: "/comidas?desde=…#x" → "/comidas". */
export function rutaSinQuery(url: string): string {
  return url.split(/[?#]/, 1)[0] || '/';
}

/**
 * Tras cada navegación a otra página (DESIGN.md §10), mueve el foco al <h1> de la página (o al
 * #contenido si no hay) y anuncia el título por una región aria-live, para que un lector de
 * pantalla sepa que la página ha cambiado. Se llama una vez, en el componente raíz.
 *
 * No actúa:
 * - en la primera carga (el lector ya lee la página entera);
 * - si solo cambian los query params o el fragmento (filtros, paginación, ?tipo=…: el foco
 *   sigue en el control que se ha usado);
 * - si el foco está en unas pestañas (role="tablist"): con activación automática, las flechas
 *   navegan y quitarles el foco rompería el patrón de teclado;
 * - si hay un diálogo abierto (el foco está atrapado en él).
 */
export function activarFocoTrasNavegacion(): void {
  const router = inject(Router);
  const documento = inject(DOCUMENT);
  const titulo = inject(Title);
  const injector = inject(Injector);
  const region = crearRegionAnuncios(documento);
  const destroyRef = inject(DestroyRef);
  destroyRef.onDestroy(() => region.remove());

  let anterior: string | null = null;
  // Se mira al empezar: al terminar, la página vieja ya no existe y el foco ha vuelto al <body>.
  let desdePestanas = false;
  router.events
    .pipe(
      filter((e): e is NavigationStart => e instanceof NavigationStart),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe(() => {
      desdePestanas = !!documento.activeElement?.closest('[role="tablist"]');
    });
  router.events
    .pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe((evento) => {
      const ruta = rutaSinQuery(evento.urlAfterRedirects);
      const primera = anterior === null;
      const mismaPagina = ruta === anterior;
      anterior = ruta;
      if (primera || mismaPagina) return;

      if (desdePestanas) return;
      if (documento.querySelector('.cdk-overlay-container [aria-modal="true"]')) return;

      // Después de pintar la página nueva (su h1 y el título de la pestaña ya están puestos).
      afterNextRender(
        () => {
          const destino = documento.querySelector<HTMLElement>('main h1, h1') ?? documento.getElementById('contenido');
          if (destino) {
            if (!destino.hasAttribute('tabindex')) destino.setAttribute('tabindex', '-1');
            destino.focus({ preventScroll: true });
          }
          anunciar(region, titulo.getTitle());
        },
        { injector },
      );
    });
}

/** Región aria-live (polite) solo para lectores de pantalla, al final del <body>. */
function crearRegionAnuncios(documento: Document): HTMLElement {
  const region = documento.createElement('div');
  region.className = 'ns-sr-only';
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  region.setAttribute('data-ns-anuncios', '');
  documento.body.appendChild(region);
  return region;
}

function anunciar(region: HTMLElement, texto: string): void {
  // Vaciar y volver a escribir hace que se anuncie aunque el texto se repita.
  region.textContent = '';
  setTimeout(() => (region.textContent = `Página: ${texto}`), 100);
}
