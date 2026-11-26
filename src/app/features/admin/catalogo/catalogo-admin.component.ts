import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsTabPanelDirective, NsTabsComponent } from '@shared/ui/nav/tabs.component';

type PestanaCatalogo = 'alimentos' | 'categorias';

const PESTANAS: NsOpcion<PestanaCatalogo>[] = [
  { valor: 'alimentos', etiqueta: 'Alimentos' },
  { valor: 'categorias', etiqueta: 'Categorías' },
];

/**
 * Catálogo (/admin/catalogo, DESIGN.md §7.17): pestañas Alimentos · Categorías, cada una con su
 * ruta hija (/admin/catalogo/alimentos, /admin/catalogo/categorias). La pestaña activa sale de la
 * URL y cambiar de pestaña navega; así cada una se puede enlazar y conserva sus filtros en la URL.
 */
@Component({
  selector: 'app-catalogo-admin',
  imports: [RouterOutlet, NsTabsComponent, NsTabPanelDirective],
  template: `
    <header class="ns-catalogo__cabecera">
      <h2 class="ns-text-h3 ns-catalogo__titulo">Catálogo</h2>
      <p class="ns-catalogo__ayuda">Alimentos públicos y de usuarios, revisión de alérgenos y categorías.</p>
    </header>
    <ns-tabs
      [pestanas]="pestanas"
      [seleccionada]="activa()"
      (seleccionadaChange)="ir($event)"
      etiqueta="Secciones del catálogo"
    >
      <div class="ns-catalogo__panel" [nsTabPanel]="activa()">
        <router-outlet />
      </div>
    </ns-tabs>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-5);
    }
    .ns-catalogo__titulo {
      margin: 0;
    }
    .ns-catalogo__ayuda {
      margin: var(--ns-space-1) 0 0;
      color: var(--ns-text-secondary);
    }
    .ns-catalogo__panel {
      padding-top: var(--ns-space-5);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoAdminComponent {
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly pestanas = PESTANAS;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Pestaña de la URL (/admin/catalogo/categorias?… → 'categorias'); por defecto Alimentos. */
  protected readonly activa = computed<PestanaCatalogo>(() => {
    const segmento = this.url().split('?')[0].split('/').pop();
    return segmento === 'categorias' ? 'categorias' : 'alimentos';
  });

  protected ir(pestana: string | null): void {
    if (pestana && pestana !== this.activa()) void this.router.navigate([pestana], { relativeTo: this.ruta });
  }
}
