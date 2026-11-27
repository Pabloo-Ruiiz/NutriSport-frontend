import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { Observable } from 'rxjs';

import { LayoutService } from '@core/layout/layout.service';
import type { MenuResponse } from '@core/models';
import { ETIQUETAS_ESTADO_MENU } from '@core/models/etiquetas';
import { MenusService } from '@core/services/menus.service';
import { aApiError } from '@core/util/api-error';
import { hoyLocal, lunesDeLaSemana } from '@core/util/fechas';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { AnadirRecetaDrawerComponent } from './componentes/anadir-receta-drawer.component';
import { DiaPlanificadorComponent } from './componentes/dia-planificador.component';
import { ResumenSemanaComponent } from './componentes/resumen-semana.component';
import { WeekPlannerComponent } from './componentes/week-planner.component';
import { DuplicarMenuDialogComponent, type DuplicarMenuData } from './dialogos/duplicar-menu-dialog.component';
import { GenerarMenuDialogComponent, type GenerarMenuData } from './dialogos/generar-menu-dialog.component';
import { RenombrarMenuDialogComponent, type RenombrarMenuData } from './dialogos/renombrar-menu-dialog.component';
import { etiquetaSemana } from './planificador';
import { PlanificadorEditor } from './planificador-editor';
import { PlanificadorStore } from './planificador.store';

/** "AAAA-MM-DD" válida para ?semana= */
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Planificador semanal (/planificador, DESIGN.md §7.10 y docs/api/menus.md §7.5).
 *
 * - Cabecera: semana (‹ 23–29 nov 2026 ›), selector con los menús que se solapan con la semana,
 *   "Lista de la compra" (paso 32), "Regenerar" (o "Generar menú" si la semana está vacía) y el
 *   menú de acciones del menú elegido.
 * - Resumen del menú y, desde 768 px, la rejilla semanal; en móvil, la vista por día.
 * - Todo lo que devuelve el servidor se aplica con `PlanificadorStore.reemplazarMenu`: el cliente
 *   no recalcula nada. Las ediciones de comidas (añadir, sustituir, mover, bloquear, quitar,
 *   registrar) y regenerar van por PlanificadorEditor, provisto aquí.
 * - La semana visible va en la URL (?semana=AAAA-MM-DD, el lunes): se conserva al recargar.
 */
@Component({
  selector: 'app-planificador',
  imports: [
    AnadirRecetaDrawerComponent,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    DiaPlanificadorComponent,
    FormsModule,
    LucideDynamicIcon,
    NsAlertComponent,
    NsButtonComponent,
    NsEmptyStateComponent,
    NsSelectComponent,
    NsSkeletonComponent,
    ResumenSemanaComponent,
    WeekPlannerComponent,
  ],
  providers: [PlanificadorStore, PlanificadorEditor],
  templateUrl: './planificador.component.html',
  styleUrl: './planificador.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanificadorComponent {
  /** ?semana=AAAA-MM-DD (lunes de la semana; con withComponentInputBinding). Sin él, la semana actual. */
  readonly semanaParam = input<string | undefined>(undefined, { alias: 'semana' });

  private readonly router = inject(Router);
  protected readonly store = inject(PlanificadorStore);
  protected readonly editor = inject(PlanificadorEditor);
  private readonly menusService = inject(MenusService);
  private readonly dialogos = inject(NsDialogService);
  private readonly confirmacion = inject(NsConfirmService);
  private readonly toast = inject(NsToastService);
  protected readonly esMovil = inject(LayoutService).esMovil;

  protected readonly hoy = hoyLocal();
  private readonly lunesActual = lunesDeLaSemana(this.hoy);

  protected readonly menu = this.store.menu;
  protected readonly etiqueta = computed(() => etiquetaSemana(this.store.semana()));
  protected readonly esSemanaActual = computed(() => this.store.semana() === this.lunesActual);
  /** Menús de la semana para el selector; los que no están activos llevan su estado. */
  protected readonly opcionesMenu = computed<NsOpcion<string>[]>(() =>
    this.store.menusSemana().map((m) => ({
      valor: m.id,
      etiqueta: m.estado === 'ACTIVO' ? m.nombre : `${m.nombre} · ${ETIQUETAS_ESTADO_MENU[m.estado]}`,
    })),
  );

  /**
   * Día elegido en la vista móvil: se conserva si sigue en la semana visible; si no, hoy (si está en
   * ella) o el lunes.
   */
  protected readonly fechaDia = linkedSignal<string, string>({
    source: this.store.semana,
    computation: (lunes, anterior) => {
      if (anterior && lunesDeLaSemana(anterior.value) === lunes) return anterior.value;
      return lunesDeLaSemana(this.hoy) === lunes ? this.hoy : lunes;
    },
  });

  /** Una acción del menú en curso (favorito, archivar, eliminar…). */
  protected readonly ocupado = signal(false);

  constructor() {
    // La semana sale de la URL (?semana=): así se conserva al recargar y al volver atrás. La primera
    // vez fija la semana y carga; después, cada cambio de la URL lleva a esa semana.
    let primeraVez = true;
    effect(() => {
      const param = this.semanaParam();
      untracked(() => {
        const lunes = param && FECHA.test(param) ? lunesDeLaSemana(param) : this.lunesActual;
        if (primeraVez) {
          primeraVez = false;
          this.store.semana.set(lunes);
          this.store.cargar();
        } else {
          this.store.irASemana(lunes);
        }
      });
    });
    // Y al revés: al cambiar de semana (flechas, "Esta semana", tira de fechas) se actualiza la URL
    // sin añadir una entrada al historial. La semana actual no lleva parámetro.
    effect(() => {
      const lunes = this.store.semana();
      untracked(() => {
        const valor = lunes === this.lunesActual ? null : lunes;
        if ((this.semanaParam() ?? null) === valor) return;
        void this.router.navigate([], {
          queryParams: { semana: valor },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });
    });
  }

  // ---- Semana

  protected semanaAnterior(): void {
    this.store.semanaAnterior();
  }

  protected semanaSiguiente(): void {
    this.store.semanaSiguiente();
  }

  protected irASemanaActual(): void {
    this.store.irASemana(this.hoy);
  }

  /** En móvil: al elegir en la tira un día de otra semana, se cambia de semana. */
  protected elegirDia(fecha: string): void {
    this.fechaDia.set(fecha);
    if (lunesDeLaSemana(fecha) !== this.store.semana()) this.store.irASemana(fecha);
  }

  protected seleccionarMenu(id: string | null): void {
    if (id && id !== this.menu()?.id) this.store.seleccionar(id);
  }

  // ---- Generar

  protected generar(): void {
    // Propone la semana visible si aún no ha pasado (en la actual, desde hoy); si no, el diálogo
    // propone el próximo lunes.
    const lunes = this.store.semana();
    const fechaPreferida = lunes < this.lunesActual ? null : lunes < this.hoy ? this.hoy : lunes;
    this.dialogos
      .open<GenerarMenuDialogComponent, MenuResponse, GenerarMenuData>(GenerarMenuDialogComponent, {
        titulo: 'Generar menú',
        size: 'sm',
        data: { fechaPreferida },
      })
      .closed.subscribe((menu) => {
        if (!menu) return;
        this.store.reemplazarMenu(menu);
        this.toast.exito('Menú generado', menu.nombre);
      });
  }

  /** POST regenerar, tras confirmar (se conservan las bloqueadas y las consumidas). */
  protected regenerar(): void {
    void this.editor.regenerar();
  }

  /** Se conecta con la lista de la compra en el paso 32. */
  protected listaCompra(): void {
    this.toast.info('La lista de la compra estará disponible pronto');
  }

  // ---- Acciones del menú

  protected cambiarFavorito(menu: MenuResponse): void {
    const favorito = !menu.favorito;
    this.actualizar(this.menusService.actualizar(menu.id, { favorito }), (m) =>
      this.toast.exito(favorito ? 'Guardado como favorito' : 'Quitado de favoritos', m.nombre),
    );
  }

  protected cambiarArchivado(menu: MenuResponse): void {
    const estado = menu.estado === 'ARCHIVADO' ? 'ACTIVO' : 'ARCHIVADO';
    this.actualizar(this.menusService.actualizar(menu.id, { estado }), (m) =>
      this.toast.exito(estado === 'ARCHIVADO' ? 'Menú archivado' : 'Menú reactivado', m.nombre),
    );
  }

  protected renombrar(menu: MenuResponse): void {
    this.dialogos
      .open<RenombrarMenuDialogComponent, MenuResponse, RenombrarMenuData>(RenombrarMenuDialogComponent, {
        titulo: 'Renombrar menú',
        size: 'sm',
        data: { menu },
      })
      .closed.subscribe((actualizado) => {
        if (actualizado) this.store.reemplazarMenu(actualizado);
      });
  }

  protected duplicar(menu: MenuResponse): void {
    this.dialogos
      .open<DuplicarMenuDialogComponent, MenuResponse, DuplicarMenuData>(DuplicarMenuDialogComponent, {
        titulo: 'Duplicar en otra semana',
        size: 'sm',
        data: { menu },
      })
      .closed.subscribe((copia) => {
        if (!copia) return;
        this.store.reemplazarMenu(copia);
        this.toast.exito('Menú duplicado', copia.nombre);
      });
  }

  protected async eliminar(menu: MenuResponse): Promise<void> {
    const confirmado = await this.confirmacion.confirmar({
      titulo: '¿Eliminar el menú?',
      mensaje: `Se borrará «${menu.nombre}» con sus comidas planificadas. Las comidas que ya registraste se conservan.`,
      textoConfirmar: 'Eliminar menú',
      peligro: true,
    });
    if (!confirmado || this.ocupado()) return;
    this.ocupado.set(true);
    this.menusService.eliminar(menu.id).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.store.quitarMenu(menu.id);
        this.toast.exito('Menú eliminado', menu.nombre);
      },
      error: (e: unknown) => {
        this.ocupado.set(false);
        this.toast.error('No se ha podido eliminar el menú', aApiError(e).detalle);
      },
    });
  }

  private actualizar(peticion: Observable<MenuResponse>, alTerminar: (menu: MenuResponse) => void): void {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    peticion.subscribe({
      next: (menu) => {
        this.ocupado.set(false);
        this.store.reemplazarMenu(menu);
        alTerminar(menu);
      },
      error: (e: unknown) => {
        this.ocupado.set(false);
        this.toast.error('No se ha podido guardar el cambio', aApiError(e).detalle);
      },
    });
  }
}
