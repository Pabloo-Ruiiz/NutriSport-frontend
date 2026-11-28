import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

import type { ConversacionResumenResponse } from '@core/models';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NS_TABS } from '@shared/ui/nav/tabs.component';
import { fechaConversacion, filtrarConversaciones, tituloConversacion } from '../asistente';

type Pestana = 'activas' | 'archivadas';

/**
 * Lista de conversaciones del asistente (DESIGN.md §7.15, columna de 280 px; en md y xs va dentro
 * de un drawer): "Nueva conversación", buscador en el cliente (título y vista previa), pestañas
 * Activas · Archivadas y cada conversación con título, vista previa, fecha y su menú (Renombrar,
 * Archivar/Desarchivar, Eliminar). No llama a la API: emite lo que pide el usuario.
 */
@Component({
  selector: 'app-lista-conversaciones',
  imports: [
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    FormsModule,
    LucideDynamicIcon,
    NgTemplateOutlet,
    NS_TABS,
    NsButtonComponent,
    NsInputDirective,
    NsSkeletonComponent,
  ],
  template: `
    <div class="ns-convs__cabecera">
      <button nsButton type="button" variant="ai" icon="plus" fullWidth (click)="nueva.emit()">
        Nueva conversación
      </button>
      <div class="ns-convs__buscador">
        <svg lucideIcon="search" [size]="16" aria-hidden="true"></svg>
        <input
          nsInput
          type="search"
          aria-label="Buscar conversaciones"
          placeholder="Buscar conversaciones"
          [ngModel]="busqueda()"
          (ngModelChange)="busqueda.set($event)"
        />
      </div>
    </div>

    <ns-tabs
      class="ns-convs__tabs"
      etiqueta="Conversaciones"
      [pestanas]="pestanas"
      [seleccionada]="archivadas() ? 'archivadas' : 'activas'"
      (seleccionadaChange)="cambiarPestana.emit($event === 'archivadas')"
    >
      <div nsTabPanel="activas"><ng-container [ngTemplateOutlet]="lista" /></div>
      <div nsTabPanel="archivadas"><ng-container [ngTemplateOutlet]="lista" /></div>
    </ns-tabs>

    <ng-template #lista>
      @if (cargando() && !conversaciones().length) {
        <div class="ns-convs__cargando" aria-busy="true" aria-label="Cargando conversaciones">
          @for (i of [1, 2, 3]; track i) {
            <ns-skeleton shape="rect" height="56px" />
          }
        </div>
      } @else if (!filtradas().length) {
        <p class="ns-convs__vacio">{{ textoVacio() }}</p>
      } @else {
        <ul class="ns-convs__lista" role="list">
          @for (c of filtradas(); track c.id) {
            <li class="ns-convs__item" [class.ns-convs__item--activa]="c.id === activaId()">
              <button
                type="button"
                class="ns-convs__abrir"
                [attr.aria-current]="c.id === activaId() ? 'page' : null"
                (click)="abrir.emit(c.id)"
              >
                <span class="ns-convs__fila">
                  <span class="ns-convs__titulo">{{ titulo(c.titulo) }}</span>
                  <span class="ns-convs__fecha">{{ fecha(c.ultimoMensajeEn) }}</span>
                </span>
                @if (c.vistaPrevia) {
                  <span class="ns-convs__vista">{{ c.vistaPrevia }}</span>
                }
              </button>
              <button
                type="button"
                class="ns-convs__menu"
                [cdkMenuTriggerFor]="menu"
                [attr.aria-label]="'Opciones de ' + titulo(c.titulo)"
              >
                <svg lucideIcon="ellipsis" [size]="18" aria-hidden="true"></svg>
              </button>
              <ng-template #menu>
                <div class="ns-menu" cdkMenu>
                  <button type="button" class="ns-menu__item" cdkMenuItem (cdkMenuItemTriggered)="renombrar.emit(c)">
                    <svg lucideIcon="pencil" [size]="18" aria-hidden="true"></svg>
                    Renombrar
                  </button>
                  <button type="button" class="ns-menu__item" cdkMenuItem (cdkMenuItemTriggered)="archivar.emit(c)">
                    <svg lucideIcon="archive" [size]="18" aria-hidden="true"></svg>
                    {{ c.archivada ? 'Desarchivar' : 'Archivar' }}
                  </button>
                  <hr class="ns-menu__separador" />
                  <button
                    type="button"
                    class="ns-menu__item ns-menu__item--peligro"
                    cdkMenuItem
                    (cdkMenuItemTriggered)="eliminar.emit(c)"
                  >
                    <svg lucideIcon="trash" [size]="18" aria-hidden="true"></svg>
                    Eliminar
                  </button>
                </div>
              </ng-template>
            </li>
          }
        </ul>
      }
    </ng-template>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
      min-height: 0;
    }
    .ns-convs__cabecera {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
    }
    .ns-convs__buscador {
      position: relative;
      svg {
        position: absolute;
        top: 50%;
        left: var(--ns-space-3);
        color: var(--ns-text-tertiary);
        transform: translateY(-50%);
        pointer-events: none;
      }
      input {
        padding-left: calc(var(--ns-space-3) + 16px + var(--ns-space-2));
      }
    }
    .ns-convs__tabs {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }
    .ns-convs__lista {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin: var(--ns-space-2) 0 0;
      padding: 0;
      list-style: none;
    }
    .ns-convs__item {
      display: flex;
      align-items: flex-start;
      border-radius: var(--ns-radius-md);
      &:hover {
        background: var(--ns-surface-muted);
      }
    }
    .ns-convs__item--activa,
    .ns-convs__item--activa:hover {
      background: var(--ns-ai-bg);
    }
    .ns-convs__abrir {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      padding: var(--ns-space-2) var(--ns-space-1) var(--ns-space-2) var(--ns-space-3);
      border: 0;
      background: transparent;
      color: inherit;
      text-align: left;
      cursor: pointer;
      &:focus-visible {
        border-radius: var(--ns-radius-md);
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: -2px;
      }
    }
    .ns-convs__fila {
      display: flex;
      gap: var(--ns-space-2);
      align-items: baseline;
      justify-content: space-between;
    }
    .ns-convs__titulo,
    .ns-convs__vista {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .ns-convs__titulo {
      color: var(--ns-text);
      font: 600 0.875rem/1.25rem var(--ns-font-body);
    }
    .ns-convs__item--activa .ns-convs__titulo {
      color: var(--ns-accent);
    }
    .ns-convs__fecha {
      flex: none;
      color: var(--ns-text-tertiary);
      font: 500 0.75rem/1rem var(--ns-font-body);
    }
    .ns-convs__vista {
      color: var(--ns-text-secondary);
      font: 400 0.8125rem/1.125rem var(--ns-font-body);
    }
    .ns-convs__menu {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      margin: var(--ns-space-1);
      border: 0;
      border-radius: var(--ns-radius-sm);
      background: transparent;
      color: var(--ns-text-tertiary);
      cursor: pointer;
      &:hover {
        background: var(--ns-surface-sunken);
        color: var(--ns-text);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 1px;
      }
    }
    .ns-convs__vacio {
      margin: var(--ns-space-4) var(--ns-space-2);
      color: var(--ns-text-secondary);
      font-size: 0.875rem;
    }
    .ns-convs__cargando {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
      margin-top: var(--ns-space-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaConversacionesComponent {
  readonly conversaciones = input.required<readonly ConversacionResumenResponse[]>();
  readonly activaId = input<string | null>(null);
  /** Pestaña Archivadas. */
  readonly archivadas = input(false);
  readonly cargando = input(false);

  readonly nueva = output<void>();
  readonly abrir = output<string>();
  readonly cambiarPestana = output<boolean>();
  readonly renombrar = output<ConversacionResumenResponse>();
  readonly archivar = output<ConversacionResumenResponse>();
  readonly eliminar = output<ConversacionResumenResponse>();

  protected readonly pestanas: { valor: Pestana; etiqueta: string }[] = [
    { valor: 'activas', etiqueta: 'Activas' },
    { valor: 'archivadas', etiqueta: 'Archivadas' },
  ];
  protected readonly busqueda = signal('');
  protected readonly filtradas = computed(() => filtrarConversaciones(this.conversaciones(), this.busqueda()));
  protected readonly textoVacio = computed(() => {
    if (this.busqueda().trim()) return 'Ninguna conversación coincide con la búsqueda.';
    return this.archivadas() ? 'No tienes conversaciones archivadas.' : 'Aún no tienes conversaciones.';
  });

  protected readonly titulo = tituloConversacion;
  protected fecha(ultimoMensajeEn: string | null): string {
    return fechaConversacion(ultimoMensajeEn);
  }
}
