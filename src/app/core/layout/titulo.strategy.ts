import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const NOMBRE_APP = 'NutriSport';

/**
 * Título de la pestaña: el `title` de la ruta + " · NutriSport" ("Comidas · NutriSport").
 * Las rutas llevan el título corto, que es también el que pinta la topbar (titulo-pagina.ts).
 */
@Injectable({ providedIn: 'root' })
export class NutriSportTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(estado: RouterStateSnapshot): void {
    const titulo = this.buildTitle(estado);
    this.title.setTitle(titulo ? `${titulo} · ${NOMBRE_APP}` : NOMBRE_APP);
  }
}
