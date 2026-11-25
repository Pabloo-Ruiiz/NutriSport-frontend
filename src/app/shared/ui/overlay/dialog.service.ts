import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { ComponentType, createGlobalPositionStrategy } from '@angular/cdk/overlay';
import { Injectable, InjectionToken, Injector, inject } from '@angular/core';

import { LayoutService } from '@core/layout/layout.service';
import { idUnico } from '../form/control-campo';

export type NsDialogSize = 'sm' | 'md' | 'lg';

/** Ancho del panel en escritorio (DESIGN.md §5.6). */
const ANCHOS: Record<NsDialogSize, string> = { sm: '400px', md: '560px', lg: '720px' };

export interface NsDialogConfig<D = unknown> {
  /** Datos para el componente: se leen con inject(DIALOG_DATA). */
  data?: D;
  /** Ancho en escritorio: sm 400 px, md 560 px (por defecto), lg 720 px. En móvil, ancho completo. */
  size?: NsDialogSize;
  /** Título de la cabecera de ns-dialog-shell; también es el nombre accesible del diálogo. */
  titulo?: string;
  /** false impide cerrarlo con Escape o con un clic en el fondo (p. ej. mientras se guarda). */
  cerrable?: boolean;
  /**
   * Elemento que recibe el foco al abrir. Por defecto el primero enfocable, o el que tenga el
   * atributo cdkFocusInitial.
   */
  autoFocus?: 'first-tabbable' | 'dialog' | string;
}

/** Contexto que el servicio pasa a ns-dialog-shell. */
export interface NsDialogContexto {
  titulo?: string;
  /** Id del título, enlazado con aria-labelledby del diálogo. */
  idTitulo: string;
  size: NsDialogSize;
  /** true en móvil: se presenta como bottom sheet. */
  sheet: boolean;
}

export const NS_DIALOG_CONTEXTO = new InjectionToken<NsDialogContexto>('NS_DIALOG_CONTEXTO');

/**
 * Abre diálogos modales sobre CDK Dialog (DESIGN.md §5.6): foco atrapado, Escape cierra y el foco
 * vuelve al botón que lo abrió.
 *
 * - Escritorio y tablet: centrado, con el ancho del tamaño elegido.
 * - Móvil (< 768 px): bottom sheet a ancho completo, máx. 90 % del alto y respetando el safe-area.
 *
 *   const ref = this.dialogos.open<EditarComidaComponent, Comida>(EditarComidaComponent, {
 *     titulo: 'Editar comida', size: 'md', data: { comida },
 *   });
 *   ref.closed.subscribe((comida) => …);
 *
 * El componente abierto pinta su contenido dentro de <ns-dialog-shell>, que da la cabecera
 * (título y botón cerrar) y el pie de acciones.
 */
@Injectable({ providedIn: 'root' })
export class NsDialogService {
  private readonly dialog = inject(Dialog);
  private readonly layout = inject(LayoutService);
  private readonly injector = inject(Injector);

  open<T, R = unknown, D = unknown>(componente: ComponentType<T>, config: NsDialogConfig<D> = {}): DialogRef<R, T> {
    const size = config.size ?? 'md';
    const sheet = this.layout.esMovil();
    const contexto: NsDialogContexto = { titulo: config.titulo, idTitulo: idUnico('ns-dialog-titulo'), size, sheet };
    const posicion = createGlobalPositionStrategy(this.injector).centerHorizontally();

    return this.dialog.open<R, D, T>(componente, {
      data: config.data,
      disableClose: config.cerrable === false,
      autoFocus: config.autoFocus ?? 'first-tabbable',
      restoreFocus: true,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      panelClass: ['ns-dialog-pane', sheet ? 'ns-dialog-pane--sheet' : 'ns-dialog-pane--centrado'],
      // ns-dialog-shell pinta el título con este id.
      ariaLabelledBy: contexto.idTitulo,
      ...(sheet
        ? { width: '100%', maxWidth: '100%', maxHeight: '90dvh', positionStrategy: posicion.bottom('0') }
        : {
            width: ANCHOS[size],
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100dvh - 48px)',
            positionStrategy: posicion.centerVertically(),
          }),
      providers: [{ provide: NS_DIALOG_CONTEXTO, useValue: contexto }],
    });
  }
}
