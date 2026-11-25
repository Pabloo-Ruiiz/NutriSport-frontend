import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { hasModifierKey } from '@angular/cdk/keycodes';
import {
  OverlayRef,
  createBlockScrollStrategy,
  createGlobalPositionStrategy,
  createOverlayRef,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
  model,
  untracked,
  viewChild,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { idUnico } from '../form/control-campo';

/**
 * Panel lateral modal a la derecha (filtros, detalle, ajustes) sobre CDK Overlay: fondo oscuro,
 * foco atrapado dentro, Escape o clic fuera para cerrar, y el foco vuelve a donde estaba.
 *
 *   <button nsButton (click)="filtros.set(true)">Filtros</button>
 *   <ns-drawer [(abierto)]="filtros" titulo="Filtros">
 *     …contenido…
 *     <button nsDrawerAcciones nsButton (click)="aplicar()">Aplicar</button>
 *   </ns-drawer>
 *
 * En pantallas más estrechas que `ancho`, ocupa el ancho completo.
 */
@Component({
  selector: 'ns-drawer',
  imports: [LucideDynamicIcon],
  template: `
    <ng-template #plantilla>
      <div
        class="ns-drawer"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="idTitulo"
        [style.width]="anchoCss()"
      >
        <header class="ns-drawer__cabecera">
          <h2 class="ns-drawer__titulo ns-text-h4" [id]="idTitulo">{{ titulo() }}</h2>
          <button type="button" class="ns-drawer__cerrar" [attr.aria-label]="etiquetaCerrar()" (click)="cerrar()">
            <svg lucideIcon="x" [size]="20" aria-hidden="true"></svg>
          </button>
        </header>
        <div class="ns-drawer__cuerpo"><ng-content /></div>
        <footer class="ns-drawer__pie"><ng-content select="[nsDrawerAcciones]" /></footer>
      </div>
    </ng-template>
  `,
  styleUrl: './drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsDrawerComponent {
  /** Abierto o cerrado; admite [(abierto)]. */
  readonly abierto = model(false);
  readonly titulo = input.required<string>();
  /** Ancho en px (número) o cualquier medida CSS. 560 px por defecto. */
  readonly ancho = input<number | string>(560);
  readonly etiquetaCerrar = input('Cerrar panel');

  protected readonly idTitulo = idUnico('ns-drawer-titulo');

  private readonly plantilla = viewChild.required<TemplateRef<unknown>>('plantilla');

  private readonly injector = inject(Injector);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private readonly documento = inject(DOCUMENT);

  private overlayRef: OverlayRef | null = null;
  private focusTrap: FocusTrap | null = null;
  private focoPrevio: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const abierto = this.abierto();
      untracked(() => (abierto ? this.abrirPanel() : this.cerrarPanel()));
    });
    inject(DestroyRef).onDestroy(() => this.cerrarPanel());
  }

  protected anchoCss(): string {
    const ancho = this.ancho();
    return typeof ancho === 'number' ? `${ancho}px` : ancho;
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  private abrirPanel(): void {
    if (this.overlayRef) return;
    this.focoPrevio = this.documento.activeElement as HTMLElement | null;

    const overlayRef = createOverlayRef(this.injector, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      panelClass: 'ns-drawer-pane',
      positionStrategy: createGlobalPositionStrategy(this.injector).right('0').top('0'),
      scrollStrategy: createBlockScrollStrategy(this.injector),
      height: '100%',
      maxWidth: '100vw',
      disposeOnNavigation: true,
    });
    const vista = overlayRef.attach(new TemplatePortal(this.plantilla(), this.viewContainerRef));
    // Se pinta ya para que la trampa de foco encuentre los elementos enfocables.
    vista.detectChanges();
    overlayRef.backdropClick().subscribe(() => this.cerrar());
    overlayRef.keydownEvents().subscribe((evento) => {
      if (evento.key === 'Escape' && !hasModifierKey(evento)) {
        evento.preventDefault();
        this.cerrar();
      }
    });
    // Navegar (disposeOnNavigation) también lo cierra: se sincroniza el estado.
    overlayRef.detachments().subscribe(() => {
      if (this.abierto()) this.abierto.set(false);
    });
    this.overlayRef = overlayRef;

    const panel = vista.rootNodes.find((nodo): nodo is HTMLElement => nodo instanceof HTMLElement);
    if (panel) {
      this.focusTrap = this.focusTrapFactory.create(panel);
      void this.focusTrap.focusInitialElementWhenReady();
    }
  }

  private cerrarPanel(): void {
    if (!this.overlayRef) return;
    this.focusTrap?.destroy();
    this.focusTrap = null;
    const overlayRef = this.overlayRef;
    this.overlayRef = null;
    overlayRef.dispose();
    this.focoPrevio?.focus?.();
    this.focoPrevio = null;
  }
}
