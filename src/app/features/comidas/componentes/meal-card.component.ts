import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import type { RegistroComidaResponse } from '@core/models';
import { formatearNumero } from '@shared/pipes/formato';
import { NsCardComponent } from '@shared/ui/card/card.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { badgeOrigen, etiquetaTipo, horaCorta, iconoTipo, resumirAlimentos } from './comida-util';

/**
 * Tarjeta `meal` (DESIGN.md §5.5, §7.9): icono del tipo de comida en una miniatura de 56 px, tipo y
 * hora, alimentos resumidos, kcal y chips de P/HC/G, badge de procedencia y menú contextual.
 *
 *   <app-meal-card [comida]="c" (ver)="abrir($event)" (editar)="…" (duplicar)="…" (eliminar)="…" />
 *
 * Un clic en la tarjeta emite `ver`. El menú (⋯) ofrece Ver, Editar, Duplicar y Eliminar.
 */
@Component({
  selector: 'app-meal-card',
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger, LucideDynamicIcon, NsBadgeComponent, NsCardComponent],
  template: `
    <ns-card padding="sm">
      <div class="ns-meal">
        <button type="button" class="ns-meal__abrir" (click)="ver.emit(comida())" [attr.aria-label]="etiquetaAbrir()">
          <span class="ns-meal__miniatura" aria-hidden="true">
            <svg [lucideIcon]="icono()" [size]="24"></svg>
          </span>
          <span class="ns-meal__textos">
            <span class="ns-meal__cabecera">
              <span class="ns-meal__tipo">{{ tipo() }}</span>
              @if (hora(); as hora) {
                <span class="ns-meal__hora ns-tnum">{{ hora }}</span>
              }
              @if (origen(); as origen) {
                <ns-badge [variant]="origen.variant" [icon]="origen.icono">{{ origen.texto }}</ns-badge>
              }
            </span>
            <span class="ns-meal__alimentos">{{ alimentos() }}</span>
            <span class="ns-meal__macros">
              <ns-badge variant="protein"><abbr title="Proteína">P</abbr> {{ g(comida().totales.proteina) }}</ns-badge>
              <ns-badge variant="carbs"
                ><abbr title="Hidratos de carbono">HC</abbr> {{ g(comida().totales.carbohidratos) }}</ns-badge
              >
              <ns-badge variant="fat"><abbr title="Grasa">G</abbr> {{ g(comida().totales.grasa) }}</ns-badge>
            </span>
          </span>
          <span class="ns-meal__kcal">
            <span class="ns-text-card-title ns-tnum">{{ kcal() }}</span>
            <span class="ns-meal__unidad">kcal</span>
          </span>
        </button>

        <button
          type="button"
          class="ns-meal__menu"
          [cdkMenuTriggerFor]="menu"
          [attr.aria-label]="'Opciones de ' + etiquetaAbrir()"
        >
          <svg lucideIcon="ellipsis" [size]="20" aria-hidden="true"></svg>
        </button>
      </div>
    </ns-card>

    <ng-template #menu>
      <div class="ns-menu" cdkMenu>
        <button type="button" class="ns-menu__item" cdkMenuItem (cdkMenuItemTriggered)="ver.emit(comida())">
          <svg lucideIcon="eye" [size]="18" aria-hidden="true"></svg>
          Ver
        </button>
        <button type="button" class="ns-menu__item" cdkMenuItem (cdkMenuItemTriggered)="editar.emit(comida())">
          <svg lucideIcon="pencil" [size]="18" aria-hidden="true"></svg>
          Editar
        </button>
        <button type="button" class="ns-menu__item" cdkMenuItem (cdkMenuItemTriggered)="duplicar.emit(comida())">
          <svg lucideIcon="copy" [size]="18" aria-hidden="true"></svg>
          Duplicar
        </button>
        <hr class="ns-menu__separador" />
        <button
          type="button"
          class="ns-menu__item ns-menu__item--peligro"
          cdkMenuItem
          (cdkMenuItemTriggered)="eliminar.emit(comida())"
        >
          <svg lucideIcon="trash" [size]="18" aria-hidden="true"></svg>
          Eliminar
        </button>
      </div>
    </ng-template>
  `,
  styles: `
    @use 'components/menu';

    :host {
      display: block;
    }
    .ns-meal {
      display: flex;
      align-items: flex-start;
      gap: var(--ns-space-2);
    }
    .ns-meal__abrir {
      display: flex;
      flex: 1;
      align-items: center;
      gap: var(--ns-space-3);
      min-width: 0;
      padding: 0;
      border: 0;
      border-radius: var(--ns-radius-md);
      background: transparent;
      color: var(--ns-text);
      font: inherit;
      text-align: left;
      cursor: pointer;
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 4px;
      }
      &:hover .ns-meal__tipo {
        text-decoration: underline;
      }
    }
    .ns-meal__miniatura {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: var(--ns-radius-lg);
      background: var(--ns-surface-muted);
      color: var(--ns-text-secondary);
    }
    .ns-meal__textos {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: var(--ns-space-1);
      min-width: 0;
    }
    .ns-meal__cabecera {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ns-space-2);
    }
    .ns-meal__tipo {
      font-weight: 600;
    }
    .ns-meal__hora {
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
    }
    .ns-meal__alimentos {
      overflow: hidden;
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ns-meal__macros {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-1);
      abbr {
        text-decoration: none;
      }
    }
    .ns-meal__kcal {
      display: flex;
      flex-shrink: 0;
      flex-direction: column;
      align-items: flex-end;
    }
    .ns-meal__unidad {
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
    }
    .ns-meal__menu {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 40px;
      height: 40px;
      margin: -8px -8px 0 0;
      @media (max-width: 767.98px) {
        width: 44px;
        height: 44px;
        margin: -10px -10px 0 0;
      }
      border: 0;
      border-radius: var(--ns-radius-md);
      background: transparent;
      color: var(--ns-text-secondary);
      cursor: pointer;
      &:hover,
      &[aria-expanded='true'] {
        background: var(--ns-surface-muted);
        color: var(--ns-text);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
    }

    @include menu.contextual;
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealCardComponent {
  readonly comida = input.required<RegistroComidaResponse>();

  readonly ver = output<RegistroComidaResponse>();
  readonly editar = output<RegistroComidaResponse>();
  readonly duplicar = output<RegistroComidaResponse>();
  readonly eliminar = output<RegistroComidaResponse>();

  protected readonly tipo = computed(() => etiquetaTipo(this.comida()));
  protected readonly icono = computed(() => iconoTipo(this.comida()));
  protected readonly hora = computed(() => horaCorta(this.comida()));
  protected readonly origen = computed(() => badgeOrigen(this.comida().origen));
  protected readonly alimentos = computed(() => resumirAlimentos(this.comida().alimentos.map((a) => a.nombre)));
  protected readonly kcal = computed(() => formatearNumero(this.comida().totales.kcal));
  /** "Desayuno de las 08:30 (Foto): avena, leche y plátano, 450 kcal" para lectores de pantalla. */
  protected readonly etiquetaAbrir = computed(() => {
    const hora = this.hora();
    const origen = this.origen();
    return `${this.tipo()}${hora ? ` de las ${hora}` : ''}${origen ? ` (${origen.texto})` : ''}: ${this.alimentos()}, ${this.kcal()} kcal`;
  });

  protected g(valor: number): string {
    return `${formatearNumero(valor)} g`;
  }
}
