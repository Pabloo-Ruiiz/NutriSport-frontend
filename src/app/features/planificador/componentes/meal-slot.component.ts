import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import type { ComidaPlanificadaResponse } from '@core/models';
import { hoyLocal, sumarDias } from '@core/util/fechas';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { GramosPipe } from '@shared/pipes/gramos.pipe';
import { formatearNumero } from '@shared/pipes/formato';
import { KcalPipe } from '@shared/pipes/kcal.pipe';
import { PlanificadorEditor } from '../planificador-editor';

/**
 * Comida planificada (meal-slot, DESIGN.md §7.10 y §7.23): nombre de la receta (13 px), kcal y
 * proteína (12 px) y badges "Bloqueada" y "Consumida". Sin miniatura.
 *
 * Menú de acciones (botón ⋯ que aparece al pasar el ratón o al llegar con el teclado; siempre
 * visible en pantallas táctiles): Sustituir, Pedir sugerencia IA, Bloquear/Desbloquear, Mover a…,
 * Registrar como consumida, Ver receta, Añadir ingredientes a la lista y Quitar. Una comida consumida solo
 * permite Ver receta. Sin PlanificadorEditor (fuera del planificador) no hay menú.
 */
@Component({
  selector: 'app-meal-slot',
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger, GramosPipe, KcalPipe, LucideDynamicIcon, NsBadgeComponent],
  template: `
    @if (editor) {
      <button
        type="button"
        class="ns-slot__mas"
        [attr.aria-label]="'Acciones de ' + comida().receta.nombre"
        [cdkMenuTriggerFor]="acciones"
      >
        <svg lucideIcon="ellipsis" [size]="16" aria-hidden="true"></svg>
      </button>
    }
    <p class="ns-slot__nombre">{{ comida().receta.nombre }}</p>
    <p class="ns-slot__cifras">
      {{ comida().nutrientes.kcal | kcal }} · <abbr title="Proteína">P</abbr>
      {{ comida().nutrientes.proteina | gramos }}
      @if (comida().raciones !== 1) {
        · {{ raciones() }} rac.
      }
    </p>
    @if (comida().bloqueada || comida().consumida) {
      <div class="ns-slot__badges">
        @if (comida().bloqueada) {
          <ns-badge icon="lock">Bloqueada</ns-badge>
        }
        @if (comida().consumida) {
          <ns-badge variant="success" icon="check">Consumida</ns-badge>
        }
      </div>
    }

    <ng-template #acciones>
      <div class="ns-menu" cdkMenu>
        @if (!comida().consumida) {
          <button type="button" class="ns-menu__item" cdkMenuItem (cdkMenuItemTriggered)="sustituir()">
            <svg lucideIcon="refresh-cw" [size]="18" aria-hidden="true"></svg>
            Sustituir
          </button>
          <button
            type="button"
            class="ns-menu__item"
            cdkMenuItem
            (cdkMenuItemTriggered)="editor!.abrirSugerencia(comida())"
          >
            <svg lucideIcon="sparkles" [size]="18" aria-hidden="true"></svg>
            Pedir sugerencia IA
          </button>
          <button
            type="button"
            class="ns-menu__item"
            cdkMenuItem
            (cdkMenuItemTriggered)="editor!.cambiarBloqueo(comida())"
          >
            <svg lucideIcon="lock" [size]="18" aria-hidden="true"></svg>
            {{ comida().bloqueada ? 'Desbloquear' : 'Bloquear' }}
          </button>
          <button type="button" class="ns-menu__item" cdkMenuItem (cdkMenuItemTriggered)="editor!.abrirMover(comida())">
            <svg lucideIcon="calendar" [size]="18" aria-hidden="true"></svg>
            Mover a…
          </button>
          <button
            type="button"
            class="ns-menu__item"
            cdkMenuItem
            [cdkMenuItemDisabled]="!registrable()"
            [attr.title]="registrable() ? null : 'Solo se pueden registrar comidas hasta mañana'"
            (cdkMenuItemTriggered)="editor!.abrirRegistrar(comida())"
          >
            <svg lucideIcon="circle-check" [size]="18" aria-hidden="true"></svg>
            Registrar como consumida
          </button>
        }
        <button type="button" class="ns-menu__item" cdkMenuItem (cdkMenuItemTriggered)="editor!.verReceta(comida())">
          <svg lucideIcon="eye" [size]="18" aria-hidden="true"></svg>
          Ver receta
        </button>
        @if (!comida().consumida) {
          <button type="button" class="ns-menu__item" cdkMenuItem (cdkMenuItemTriggered)="editor!.anadirALista()">
            <svg lucideIcon="shopping-basket" [size]="18" aria-hidden="true"></svg>
            Añadir ingredientes a la lista
          </button>
          <hr class="ns-menu__separador" />
          <button
            type="button"
            class="ns-menu__item ns-menu__item--peligro"
            cdkMenuItem
            (cdkMenuItemTriggered)="editor!.quitar(comida())"
          >
            <svg lucideIcon="trash" [size]="18" aria-hidden="true"></svg>
            Quitar
          </button>
        }
      </div>
    </ng-template>
  `,
  styles: `
    @use 'components/menu';

    :host {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-1);
      min-width: 0;
      padding: var(--ns-space-3);
      border: 1px solid var(--ns-border);
      border-radius: var(--ns-radius-md);
      background: var(--ns-surface);
    }
    :host(.ns-slot--consumida) {
      border-color: var(--ns-success-border);
    }
    .ns-slot__mas {
      position: absolute;
      top: var(--ns-space-1);
      right: var(--ns-space-1);
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: 0;
      border-radius: var(--ns-radius-sm);
      background: var(--ns-surface);
      color: var(--ns-text-secondary);
      cursor: pointer;
      opacity: 0;

      &:hover {
        background: var(--ns-surface-muted);
        color: var(--ns-text);
      }
      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 1px;
      }
      // Visible al pasar el ratón, con el foco dentro, con el menú abierto y en pantallas táctiles.
      :host(:hover) &,
      :host(:focus-within) &,
      &[aria-expanded='true'] {
        opacity: 1;
      }
      @media (hover: none) {
        opacity: 1;
        width: 36px;
        height: 36px;
      }
    }
    .ns-slot__nombre {
      padding-right: var(--ns-space-6);
      display: -webkit-box;
      margin: 0;
      overflow: hidden;
      color: var(--ns-text);
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1.125rem;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow-wrap: anywhere;
    }
    .ns-slot__cifras {
      margin: 0;
      color: var(--ns-text-secondary);
      font-size: 0.75rem;
      line-height: 1rem;
      font-variant-numeric: tabular-nums;
    }
    abbr {
      text-decoration: none;
    }
    .ns-slot__badges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ns-space-1);
      margin-top: var(--ns-space-1);
    }
  `,
  host: { class: 'ns-slot', '[class.ns-slot--consumida]': 'comida().consumida' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealSlotComponent {
  readonly comida = input.required<ComidaPlanificadaResponse>();

  protected readonly editor = inject(PlanificadorEditor, { optional: true });
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Una comida registrada puede ser como mucho de mañana (docs/api/menus.md §6). */
  protected readonly registrable = computed(() => this.comida().fecha <= sumarDias(hoyLocal(), 1));

  protected sustituir(): void {
    void this.editor?.abrirAlternativas(this.comida(), this.elemento.nativeElement);
  }

  /** Raciones en formato es-ES y sin decimales sobrantes: 2 → "2", 1.5 → "1,5", 1.25 → "1,25". */
  protected readonly raciones = computed(() => formatearRaciones(this.comida().raciones));
}

/** 2 → "2", 1.5 → "1,5", 1.25 → "1,25" (como mucho dos decimales). */
export function formatearRaciones(raciones: number): string {
  const decimales = Number.isInteger(raciones) ? 0 : Number.isInteger(raciones * 10) ? 1 : 2;
  return formatearNumero(raciones, decimales);
}
