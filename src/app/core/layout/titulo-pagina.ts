import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/**
 * Título de la página para la topbar: el `title` de la ruta más profunda que lo tenga (las rutas
 * llevan el título corto; NutriSportTitleStrategy añade la marca solo en la pestaña). Las rutas
 * pueden fijar otro con `data: { tituloPagina: '…' }`.
 * Se llama en un contexto de inyección.
 */
export function tituloPagina() {
  const router = inject(Router);
  return toSignal(
    router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map(() => leerTitulo(router.routerState.snapshot.root)),
    ),
    { initialValue: leerTitulo(router.routerState.snapshot.root) },
  );
}

export function leerTitulo(raiz: ActivatedRouteSnapshot): string {
  let titulo = '';
  for (let ruta: ActivatedRouteSnapshot | null = raiz; ruta; ruta = ruta.firstChild) {
    const propio = ruta.data['tituloPagina'] ?? ruta.title;
    if (typeof propio === 'string' && propio) titulo = propio;
  }
  return titulo;
}
