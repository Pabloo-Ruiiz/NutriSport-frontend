import { hasModifierKey } from '@angular/cdk/keycodes';
import {
  OverlayRef,
  createFlexibleConnectedPositionStrategy,
  createOverlayRef,
  createRepositionScrollStrategy,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DestroyRef, Injectable, InjectionToken, Injector, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, firstValueFrom, map } from 'rxjs';

import { LayoutService } from '@core/layout/layout.service';
import type { AnadirComidaRequest, ComidaPlanificadaResponse, MenuResponse, TipoComida } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA } from '@core/models/etiquetas';
import { MenusService } from '@core/services/menus.service';
import { aApiError } from '@core/util/api-error';
import {
  AnadirRecetaListaDialogComponent,
  type AnadirRecetaListaData,
  type AnadirRecetaListaResultado,
} from '@features/compra/anadir-receta-lista-dialog.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { MoverComidaDialogComponent, type MoverComidaData } from './dialogos/mover-comida-dialog.component';
import {
  RegistrarPlanificadaDialogComponent,
  type RegistrarPlanificadaData,
  type RegistrarPlanificadaResultado,
} from './dialogos/registrar-planificada-dialog.component';
import { PlanificadorStore } from './planificador.store';

/** Qué abre el drawer "Añadir receta": una franja vacía o la sustitución de una comida. */
export type ContextoReceta =
  { modo: 'anadir'; fecha: string; tipoComida: TipoComida } | { modo: 'sustituir'; comida: ComidaPlanificadaResponse };

/** Datos del panel de alternativas (CDK Overlay en escritorio, bottom sheet en móvil). */
export interface AlternativasData {
  comida: ComidaPlanificadaResponse;
  /** Cierra el panel (overlay o diálogo). */
  cerrar: () => void;
}

export const ALTERNATIVAS_DATA = new InjectionToken<AlternativasData>('ALTERNATIVAS_DATA');

/** Día y franja de destino de "Mover a…". */
export interface DestinoComida {
  fecha: string;
  tipoComida: TipoComida;
}

/**
 * Edición del menú del planificador (docs/api/menus.md §6 y §7.5). Se provee en
 * PlanificadorComponent junto a PlanificadorStore, y lo usan las comidas, la rejilla, la vista
 * por día, el drawer y el panel de alternativas.
 *
 * - Cada operación sustituye el menú del store con la respuesta (`reemplazarMenu`); las que
 *   responden 204 o devuelven otra cosa (quitar, registrar) vuelven a pedir el menú. No se
 *   recalcula nada en el cliente.
 * - 409 COMIDA_CONSUMIDA o 422 (reglas de recetas, perfil…) → toast con el detalle y recarga del
 *   menú, por si lo que se ve ya no es lo que hay en el servidor.
 * - Las operaciones devuelven una promesa: true si se aplicaron (p. ej. para cerrar el drawer).
 */
@Injectable()
export class PlanificadorEditor {
  private readonly store = inject(PlanificadorStore);
  private readonly menusService = inject(MenusService);
  private readonly toast = inject(NsToastService);
  private readonly confirmacion = inject(NsConfirmService);
  private readonly dialogos = inject(NsDialogService);
  private readonly router = inject(Router);
  private readonly layout = inject(LayoutService);
  private readonly injector = inject(Injector);

  /** Drawer "Añadir receta" abierto (y para qué), o null. */
  readonly drawer = signal<ContextoReceta | null>(null);
  /** Hay una operación en curso: se evitan dobles envíos. */
  readonly ocupado = signal(false);

  private alternativas: { cerrar: () => void } | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cerrarAlternativas());
  }

  // ---- Drawer y panel

  abrirReceta(contexto: ContextoReceta): void {
    this.cerrarAlternativas();
    this.drawer.set(contexto);
  }

  cerrarReceta(): void {
    this.drawer.set(null);
  }

  /**
   * Alternativas de una comida: en escritorio, un panel anclado a la comida (a su derecha o, si no
   * cabe, a su izquierda: no tapa la columna del día); en móvil, un bottom sheet.
   */
  async abrirAlternativas(comida: ComidaPlanificadaResponse, origen: HTMLElement): Promise<void> {
    this.cerrarAlternativas();
    // Import dinámico: el panel inyecta este servicio (así no hay un ciclo de imports).
    const { AlternativasPanelComponent } = await import('./componentes/alternativas-panel.component');

    if (this.layout.esMovil()) {
      let ref: { close(): void } | null = null;
      const data: AlternativasData = { comida, cerrar: () => ref?.close() };
      ref = this.dialogos.open(AlternativasPanelComponent, {
        titulo: `Alternativas para ${etiquetaFranja(comida).toLocaleLowerCase('es-ES')}`,
        size: 'md',
        data,
        injector: Injector.create({
          providers: [{ provide: ALTERNATIVAS_DATA, useValue: data }],
          parent: this.injector,
        }),
      });
      this.alternativas = { cerrar: () => ref?.close() };
      return;
    }

    const overlayRef: OverlayRef = createOverlayRef(this.injector, {
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      panelClass: 'ns-alternativas-pane',
      positionStrategy: createFlexibleConnectedPositionStrategy(this.injector, origen)
        .withPositions([
          { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 8 },
          { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -8 },
          { originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom', offsetX: 8 },
          { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'bottom', offsetX: -8 },
        ])
        .withViewportMargin(16)
        .withPush(false),
      scrollStrategy: createRepositionScrollStrategy(this.injector),
      disposeOnNavigation: true,
    });
    const cerrar = () => {
      if (this.alternativas !== control) return;
      this.alternativas = null;
      overlayRef.dispose();
      // El foco vuelve al botón de acciones de la comida (o a la comida, si no lo tiene).
      (origen.querySelector<HTMLElement>('button') ?? origen).focus?.();
    };
    const control = { cerrar };
    const data: AlternativasData = { comida, cerrar };
    overlayRef.attach(
      new ComponentPortal(
        AlternativasPanelComponent,
        null,
        Injector.create({ providers: [{ provide: ALTERNATIVAS_DATA, useValue: data }], parent: this.injector }),
      ),
    );
    overlayRef.backdropClick().subscribe(cerrar);
    overlayRef.keydownEvents().subscribe((evento) => {
      if (evento.key === 'Escape' && !hasModifierKey(evento)) {
        evento.preventDefault();
        cerrar();
      }
    });
    this.alternativas = control;
  }

  cerrarAlternativas(): void {
    this.alternativas?.cerrar();
    this.alternativas = null;
  }

  // ---- Comidas

  /** POST /menus/{id}/comidas. */
  anadir(req: AnadirComidaRequest): Promise<boolean> {
    return this.aplicar((id) => this.menusService.anadirComida(id, req), 'No se ha podido añadir la receta', {
      exito: 'Receta añadida',
    });
  }

  /** PUT con la receta y las raciones nuevas (sustituir desde el drawer o las alternativas). */
  sustituir(comida: ComidaPlanificadaResponse, recetaId: string, raciones: number): Promise<boolean> {
    return this.aplicar(
      (id) => this.menusService.cambiarComida(id, comida.id, { recetaId, raciones }),
      'No se ha podido sustituir la comida',
      { exito: 'Comida sustituida' },
    );
  }

  /** PUT { bloqueada }: una comida bloqueada no cambia al regenerar. */
  cambiarBloqueo(comida: ComidaPlanificadaResponse): Promise<boolean> {
    const bloqueada = !comida.bloqueada;
    return this.aplicar(
      (id) => this.menusService.cambiarComida(id, comida.id, { bloqueada }),
      bloqueada ? 'No se ha podido bloquear la comida' : 'No se ha podido desbloquear la comida',
    );
  }

  /**
   * PUT { fecha, tipoComida }. Con `enVista` (drag & drop) la comida se mueve al momento y, si el
   * servidor lo rechaza, vuelve a su sitio.
   */
  mover(comida: ComidaPlanificadaResponse, destino: DestinoComida, enVista = false): Promise<boolean> {
    if (comida.fecha === destino.fecha && comida.tipoComida === destino.tipoComida) return Promise.resolve(false);
    const anterior = enVista ? this.store.moverEnVista(comida.id, destino.fecha, destino.tipoComida) : null;
    return this.aplicar(
      (id) => this.menusService.cambiarComida(id, comida.id, destino),
      'No se ha podido mover la comida',
      { alFallar: () => anterior && this.store.restaurar(anterior) },
    );
  }

  /** DELETE: responde 204, así que se vuelve a pedir el menú. */
  quitar(comida: ComidaPlanificadaResponse): Promise<boolean> {
    return this.aplicar(
      (id) => this.menusService.quitarComida(id, comida.id).pipe(map(() => null)),
      'No se ha podido quitar la comida',
      { exito: 'Comida quitada' },
    );
  }

  /**
   * POST …/registrar?hora=HH:mm: crea la comida registrada (origen PLAN) y se recarga el menú
   * (consumida = true). Sin hora, la pone el servidor.
   */
  registrar(comida: ComidaPlanificadaResponse, hora?: string | null): Promise<boolean> {
    return this.aplicar(
      (id) => this.menusService.registrarComida(id, comida.id, hora).pipe(map(() => null)),
      'No se ha podido registrar la comida',
      { exito: 'Comida registrada' },
    );
  }

  /** "Registrar como consumida": diálogo con la hora (opcional) y POST …/registrar. */
  async abrirRegistrar(comida: ComidaPlanificadaResponse): Promise<boolean> {
    const ref = this.dialogos.open<
      RegistrarPlanificadaDialogComponent,
      RegistrarPlanificadaResultado,
      RegistrarPlanificadaData
    >(RegistrarPlanificadaDialogComponent, { titulo: 'Registrar como consumida', size: 'sm', data: { comida } });
    const resultado = await firstValueFrom(ref.closed);
    return resultado ? this.registrar(comida, resultado.hora) : false;
  }

  /**
   * "Pedir sugerencia IA": diálogo con la tarjeta de sugerencia. Lleva el inyector de la pantalla
   * para que la tarjeta use este servicio al aplicar.
   */
  async abrirSugerencia(comida: ComidaPlanificadaResponse): Promise<void> {
    // Import dinámico: la tarjeta inyecta este servicio (así no hay un ciclo de imports).
    const { SugerenciaIaDialogComponent } = await import('./componentes/sugerencia-ia.component');
    this.dialogos.open(SugerenciaIaDialogComponent, {
      titulo: 'Sugerencia IA',
      size: 'md',
      data: { comida },
      injector: this.injector,
    });
  }

  /**
   * POST …/sugerencia-ia/aplicar { sugerenciaId }: crea una receta propia derivada, la pone en la
   * comida y devuelve el menú, que sustituye al del store.
   */
  aplicarSugerencia(comida: ComidaPlanificadaResponse, sugerenciaId: string): Promise<boolean> {
    return this.aplicar(
      (id) => this.menusService.aplicarSugerencia(id, comida.id, sugerenciaId),
      'No se ha podido aplicar la sugerencia',
      { exito: 'Sugerencia aplicada' },
    );
  }

  verReceta(comida: ComidaPlanificadaResponse): void {
    if (comida.receta.id) void this.router.navigate(['/recetas', comida.receta.id]);
  }

  /**
   * "Añadir ingredientes a la lista": elige una lista activa (o crea una con este menú) y las
   * raciones de la comida → POST /listas-compra/{id}/productos/desde-receta.
   */
  anadirALista(comida: ComidaPlanificadaResponse): void {
    const menu = this.store.menu();
    if (!comida.receta.id) return;
    this.dialogos
      .open<AnadirRecetaListaDialogComponent, AnadirRecetaListaResultado, AnadirRecetaListaData>(
        AnadirRecetaListaDialogComponent,
        {
          titulo: 'Añadir a la lista de la compra',
          size: 'sm',
          data: { receta: { id: comida.receta.id, nombre: comida.receta.nombre }, raciones: comida.raciones, menu },
        },
      )
      .closed.subscribe((resultado) => {
        if (!resultado) return;
        const { lista, nueva } = resultado;
        this.toast.exito(nueva ? 'Lista de la compra creada' : 'Ingredientes añadidos', lista.nombre, {
          texto: 'Ver lista',
          ejecutar: () => void this.router.navigate(['/compra', lista.id]),
        });
      });
  }

  /** "Mover a…": diálogo de día y franja (la alternativa accesible al drag & drop). */
  async abrirMover(comida: ComidaPlanificadaResponse): Promise<void> {
    const menu = this.store.menu();
    if (!menu) return;
    const ref = this.dialogos.open<MoverComidaDialogComponent, DestinoComida, MoverComidaData>(
      MoverComidaDialogComponent,
      { titulo: 'Mover comida', size: 'sm', data: { comida, fechas: menu.dias.map((d) => d.fecha) } },
    );
    const destino = await firstValueFrom(ref.closed);
    if (destino) await this.mover(comida, destino);
  }

  // ---- Menú

  /** POST regenerar, tras confirmar: se conservan las comidas bloqueadas y las ya consumidas. */
  async regenerar(): Promise<boolean> {
    if (!this.store.menu() || this.ocupado()) return false;
    const confirmado = await this.confirmacion.confirmar({
      titulo: '¿Regenerar el menú?',
      mensaje: 'Se volverán a elegir las comidas. Se mantendrán las comidas bloqueadas y las ya consumidas.',
      textoConfirmar: 'Regenerar',
    });
    if (!confirmado) return false;
    return this.aplicar((id) => this.menusService.regenerar(id), 'No se ha podido regenerar el menú', {
      exito: 'Menú regenerado',
    });
  }

  // ---- Común

  /**
   * Lanza la petición sobre el menú seleccionado. Con un MenuResponse lo aplica tal cual; con null
   * (204 u otra respuesta) vuelve a pedir el menú.
   */
  private aplicar(
    peticion: (menuId: string) => Observable<MenuResponse | null>,
    tituloError: string,
    opciones: { exito?: string; alFallar?: () => void } = {},
  ): Promise<boolean> {
    const menuId = this.store.menu()?.id;
    if (!menuId || this.ocupado()) {
      opciones.alFallar?.();
      return Promise.resolve(false);
    }
    this.ocupado.set(true);
    return new Promise((resolver) => {
      peticion(menuId).subscribe({
        next: (menu) => {
          this.ocupado.set(false);
          if (menu) this.store.reemplazarMenu(menu);
          else this.store.recargar();
          if (opciones.exito) this.toast.exito(opciones.exito);
          resolver(true);
        },
        error: (e: unknown) => {
          this.ocupado.set(false);
          opciones.alFallar?.();
          this.fallo(e, tituloError);
          resolver(false);
        },
      });
    });
  }

  private fallo(e: unknown, titulo: string): void {
    const error = aApiError(e);
    this.toast.error(titulo, error.detalle);
    // El menú del servidor puede no ser el que se ve (comida ya consumida, receta que ya no cumple…).
    if (error.status === 422 || (error.status === 409 && error.esCodigo('COMIDA_CONSUMIDA'))) this.store.recargar();
  }
}

function etiquetaFranja(comida: Pick<ComidaPlanificadaResponse, 'tipoComida'>): string {
  return ETIQUETAS_TIPO_COMIDA[comida.tipoComida ?? 'OTRO'];
}
