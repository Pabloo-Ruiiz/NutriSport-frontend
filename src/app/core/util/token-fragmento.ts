import { ActivatedRoute } from '@angular/router';

/**
 * Token de los enlaces de los correos (NutriSport_API.md §2.2): va en el fragmento de la URL
 * (`/verificar-email#token=…`) para que no llegue a los logs ni al Referer.
 *
 * Devuelve el token (decodificado) o null si no está o está vacío. Si la URL tiene fragmento, lo
 * quita de la barra de direcciones con history.replaceState (sin navegar ni crear una entrada en
 * el historial), para que no quede a la vista ni se comparta al copiar la URL.
 */
export function leerTokenDelFragmento(route: ActivatedRoute): string | null {
  const fragmento = route.snapshot.fragment;
  if (fragmento === null || fragmento === undefined) return null;
  quitarFragmento();

  for (const parte of fragmento.split('&')) {
    const igual = parte.indexOf('=');
    if (igual === -1 || parte.slice(0, igual) !== 'token') continue;
    try {
      const token = decodeURIComponent(parte.slice(igual + 1)).trim();
      return token || null;
    } catch {
      // %E0%A4%A: secuencia mal formada (enlace cortado al copiarlo).
      return null;
    }
  }
  return null;
}

function quitarFragmento(): void {
  if (typeof history === 'undefined' || typeof location === 'undefined') return;
  // Se conserva history.state: el router guarda ahí el navigationId.
  history.replaceState(history.state, '', location.pathname + location.search);
}
