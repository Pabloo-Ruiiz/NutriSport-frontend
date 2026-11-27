import { DialogRef } from '@angular/cdk/dialog';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import type { AlternativaResponse } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA } from '@core/models/etiquetas';
import { MenusService } from '@core/services/menus.service';
import { aApiError } from '@core/util/api-error';
import { idUnico } from '@shared/ui/form/control-campo';
import { formatearFecha } from '@shared/pipes/formato';
import { GramosPipe } from '@shared/pipes/gramos.pipe';
import { KcalPipe } from '@shared/pipes/kcal.pipe';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { ALTERNATIVAS_DATA, PlanificadorEditor } from '../planificador-editor';
import { PlanificadorStore } from '../planificador.store';
import { formatearDelta } from '../planificador';
import { formatearRaciones } from './meal-slot.component';

/**
 * Alternativas para una comida (DESIGN.md §7.10): hasta 3 recetas de GET
 * /menus/{id}/comidas/{comidaId}/alternativas con su delta de kcal y proteína frente a la comida
 * actual (las cifras de las dos vienen del servidor). Al elegir una → PUT { recetaId, raciones }.
 * "Ver más recetas" abre el drawer "Añadir receta" para sustituirla.
 *
 * En escritorio es un panel de CDK Overlay anclado a la comida (PlanificadorEditor.abrirAlternativas);
 * en móvil, un bottom sheet de NsDialogService.
 */
@Component({
  selector: 'app-alternativas-panel',
  imports: [
    CdkTrapFocus,
    DialogShellComponent,
    GramosPipe,
    KcalPipe,
    LucideDynamicIcon,
    NgTemplateOutlet,
    NsAlertComponent,
    NsButtonComponent,
    NsSkeletonComponent,
  ],
  template: `
    <ng-template #contenido>
      <p class="ns-alt__actual">
        {{ fecha }} · actual: {{ comida.receta.nombre }} · {{ comida.nutrientes.kcal | kcal }} ·
        {{ comida.nutrientes.proteina | gramos }} de proteína
      </p>

      @if (cargando()) {
        <div class="ns-alt__lista" aria-busy="true" aria-label="Cargando alternativas">
          <ns-skeleton shape="rect" height="64px" />
          <ns-skeleton shape="rect" height="64px" />
        </div>
      } @else if (error(); as error) {
        <ns-alert type="error">
          {{ error }}
          <button nsAlertAcciones nsButton type="button" variant="secondary" size="sm" (click)="cargar()">
            Reintentar
          </button>
        </ns-alert>
      } @else {
        <ul class="ns-alt__lista" role="list">
          @for (alt of alternativas(); track alt.receta.id) {
            <li>
              <button
                type="button"
                class="ns-alt__opcion"
                [disabled]="!alt.receta.id || editor.ocupado()"
                (click)="elegir(alt)"
              >
                <span class="ns-alt__nombre">{{ alt.receta.nombre }}</span>
                <span class="ns-alt__cifras">
                  {{ alt.nutrientes.kcal | kcal }} ({{ delta(alt.nutrientes.kcal - comida.nutrientes.kcal) }}) ·
                  <abbr title="Proteína">P</abbr> {{ alt.nutrientes.proteina | gramos }} ({{
                    delta(alt.nutrientes.proteina - comida.nutrientes.proteina)
                  }}
                  g) · {{ raciones(alt.raciones) }} {{ alt.raciones === 1 ? 'ración' : 'raciones' }}
                </span>
              </button>
            </li>
          } @empty {
            <li class="ns-alt__vacio">No hay recetas parecidas para esta franja. Busca otra en "Ver más recetas".</li>
          }
        </ul>
      }
    </ng-template>

    @if (enDialogo) {
      <ns-dialog-shell>
        <ng-container *ngTemplateOutlet="contenido" />
        <button nsDialogAcciones nsButton type="button" variant="secondary" icon="search" (click)="verMas()">
          Ver más recetas
        </button>
      </ns-dialog-shell>
    } @else {
      <section class="ns-alt" role="dialog" [attr.aria-labelledby]="idTitulo" cdkTrapFocus cdkTrapFocusAutoCapture>
        <header class="ns-alt__cabecera">
          <h2 class="ns-alt__titulo" [id]="idTitulo">{{ titulo }}</h2>
          <button type="button" class="ns-alt__cerrar" aria-label="Cerrar" (click)="data.cerrar()">
            <svg lucideIcon="x" [size]="18" aria-hidden="true"></svg>
          </button>
        </header>
        <ng-container *ngTemplateOutlet="contenido" />
        <footer class="ns-alt__pie">
          <button nsButton type="button" variant="ghost" size="sm" icon="search" (click)="verMas()">
            Ver más recetas
          </button>
        </footer>
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .ns-alt {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
      width: 340px;
      max-width: calc(100vw - 32px);
      padding: var(--ns-space-4);
      border: 1px solid var(--ns-border);
      border-radius: var(--ns-radius-lg);
      background: var(--ns-surface);
      box-shadow: var(--ns-shadow-lg);
    }
    .ns-alt__cabecera {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--ns-space-2);
    }
    .ns-alt__titulo {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }
    .ns-alt__cerrar {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: var(--ns-radius-sm);
      background: transparent;
      color: var(--ns-text-secondary);
      cursor: pointer;

      &:hover {
        background: var(--ns-surface-muted);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
      }
    }
    .ns-alt__actual {
      margin: 0 0 var(--ns-space-3);
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
    }
    .ns-alt__lista {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ns-alt__opcion {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-1);
      width: 100%;
      padding: var(--ns-space-3);
      border: 1px solid var(--ns-border);
      border-radius: var(--ns-radius-md);
      background: var(--ns-surface);
      color: var(--ns-text);
      font: inherit;
      text-align: left;
      cursor: pointer;

      &:hover:not(:disabled) {
        border-color: var(--ns-action-primary);
        background: var(--ns-success-bg);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
      &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
    }
    .ns-alt__nombre {
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .ns-alt__cifras {
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
    }
    abbr {
      text-decoration: none;
    }
    .ns-alt__vacio {
      color: var(--ns-text-tertiary);
      font-size: 0.8125rem;
    }
    .ns-alt__pie {
      display: flex;
      justify-content: flex-end;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlternativasPanelComponent {
  protected readonly data = inject(ALTERNATIVAS_DATA);
  protected readonly editor = inject(PlanificadorEditor);
  private readonly store = inject(PlanificadorStore);
  private readonly menusService = inject(MenusService);
  protected readonly enDialogo = !!inject(DialogRef, { optional: true });

  protected readonly comida = this.data.comida;
  protected readonly fecha = formatearFecha(this.comida.fecha, 'corta');
  protected readonly titulo = `Alternativas para ${ETIQUETAS_TIPO_COMIDA[this.comida.tipoComida ?? 'OTRO'].toLocaleLowerCase('es-ES')}`;
  protected readonly idTitulo = idUnico('ns-alt-titulo');

  protected readonly alternativas = signal<AlternativaResponse[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly delta = formatearDelta;
  protected readonly raciones = formatearRaciones;

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    const menuId = this.store.menu()?.id;
    if (!menuId) return;
    this.cargando.set(true);
    this.error.set(null);
    this.menusService.alternativas(menuId, this.comida.id).subscribe({
      next: (lista) => {
        this.alternativas.set(lista.slice(0, 3));
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(aApiError(e).detalle);
        this.cargando.set(false);
      },
    });
  }

  protected async elegir(alt: AlternativaResponse): Promise<void> {
    if (!alt.receta.id) return;
    if (await this.editor.sustituir(this.comida, alt.receta.id, alt.raciones)) this.data.cerrar();
  }

  protected verMas(): void {
    this.data.cerrar();
    this.editor.abrirReceta({ modo: 'sustituir', comida: this.comida });
  }
}
