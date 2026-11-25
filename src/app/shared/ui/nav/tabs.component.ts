import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  computed,
  inject,
  input,
  model,
  viewChildren,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { idUnico } from '../form/control-campo';
import { NsOpcion } from '../form/control-valor';

/**
 * Pestañas con el patrón ARIA tablist: solo la pestaña activa está en el orden de tabulación,
 * ← → cambian de pestaña (activación automática, con vuelta al principio) e Inicio/Fin van a los
 * extremos. Los paneles se marcan con nsTabPanel y se ocultan con hidden.
 *
 *   <ns-tabs [pestanas]="pestanas" [(seleccionada)]="pestana" etiqueta="Detalle de la receta">
 *     <section nsTabPanel="ingredientes">…</section>
 *     <section nsTabPanel="nutricion">…</section>
 *   </ns-tabs>
 */
@Component({
  selector: 'ns-tabs',
  imports: [LucideDynamicIcon],
  template: `
    <div class="ns-tabs__lista" role="tablist" [attr.aria-label]="etiqueta()">
      @for (pestana of pestanas(); track pestana.valor; let i = $index) {
        <button
          #boton
          type="button"
          role="tab"
          class="ns-tabs__tab"
          [class.ns-tabs__tab--activa]="pestana.valor === activa()"
          [id]="idTab(pestana.valor)"
          [attr.aria-selected]="pestana.valor === activa()"
          [attr.aria-controls]="idPanel(pestana.valor)"
          [tabIndex]="pestana.valor === activa() ? 0 : -1"
          [disabled]="!!pestana.deshabilitada"
          (click)="seleccionar(pestana.valor)"
          (keydown)="alTeclear($event, i)"
        >
          @if (pestana.icono) {
            <svg [lucideIcon]="pestana.icono" [size]="16" aria-hidden="true"></svg>
          }
          {{ pestana.etiqueta }}
        </button>
      }
    </div>
    <ng-content />
  `,
  styleUrl: './tabs.component.scss',
  host: { class: 'ns-tabs' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsTabsComponent {
  readonly pestanas = input.required<readonly NsOpcion<string>[]>();
  /** Valor de la pestaña activa; admite [(seleccionada)]. Si es null, la primera habilitada. */
  readonly seleccionada = model<string | null>(null);
  /** Nombre accesible de la lista de pestañas. */
  readonly etiqueta = input<string>();

  private readonly prefijo = idUnico('ns-tabs');
  private readonly botones = viewChildren<ElementRef<HTMLButtonElement>>('boton');

  /** Pestaña activa efectiva (la seleccionada si existe; si no, la primera habilitada). */
  readonly activa = computed(() => {
    const pestanas = this.pestanas();
    const seleccionada = this.seleccionada();
    if (pestanas.some((p) => p.valor === seleccionada && !p.deshabilitada)) return seleccionada;
    return pestanas.find((p) => !p.deshabilitada)?.valor ?? null;
  });

  idTab(valor: string): string {
    return `${this.prefijo}-tab-${valor}`;
  }

  idPanel(valor: string): string {
    return `${this.prefijo}-panel-${valor}`;
  }

  protected seleccionar(valor: string): void {
    if (valor !== this.activa()) this.seleccionada.set(valor);
  }

  protected alTeclear(evento: KeyboardEvent, actual: number): void {
    const pestanas = this.pestanas();
    const total = pestanas.length;
    const habilitada = (i: number) => !pestanas[i].deshabilitada;
    const buscar = (desde: number, paso: 1 | -1): number => {
      for (let n = 1; n <= total; n++) {
        const i = (((desde + paso * n) % total) + total) % total;
        if (habilitada(i)) return i;
      }
      return actual;
    };

    const destino = (
      {
        ArrowRight: () => buscar(actual, 1),
        ArrowLeft: () => buscar(actual, -1),
        Home: () => buscar(-1, 1),
        End: () => buscar(total, -1),
      } as Record<string, (() => number) | undefined>
    )[evento.key]?.();
    if (destino === undefined) return;

    evento.preventDefault();
    this.seleccionar(pestanas[destino].valor);
    this.botones()[destino]?.nativeElement.focus();
  }
}

/** Panel de una pestaña: role="tabpanel", enlazado con su pestaña y oculto si no está activa. */
@Directive({
  selector: '[nsTabPanel]',
  host: {
    role: 'tabpanel',
    tabindex: '0',
    class: 'ns-tabs__panel',
    '[id]': 'tabs.idPanel(nsTabPanel())',
    '[attr.aria-labelledby]': 'tabs.idTab(nsTabPanel())',
    '[hidden]': 'tabs.activa() !== nsTabPanel()',
  },
})
export class NsTabPanelDirective {
  /** Valor de la pestaña a la que pertenece. */
  readonly nsTabPanel = input.required<string>();
  protected readonly tabs = inject(NsTabsComponent);
}

export const NS_TABS = [NsTabsComponent, NsTabPanelDirective] as const;
