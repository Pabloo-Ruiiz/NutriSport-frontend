import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';

import type { EstadoMenu, MenuResponse, MenuResumenResponse } from '@core/models';
import { MenusService } from '@core/services/menus.service';
import { aApiError } from '@core/util/api-error';
import { hoyLocal, lunesDeLaSemana, rangoDias, sumarDias } from '@core/util/fechas';

/** Menús que se piden de una vez (el máximo por página de GET /menus). */
export const MENUS_POR_PAGINA = 50;

/**
 * `desde` de GET /menus para una semana: 6 días antes del lunes. Un menú dura como mucho 7 días, así
 * que cualquiera que se solape con la semana empieza (y acaba) en esa fecha o después.
 */
export function desdeParaSemana(lunes: string): string {
  return sumarDias(lunes, -6);
}

const PRIORIDAD_ESTADO: Record<EstadoMenu, number> = { ACTIVO: 0, BORRADOR: 1, ARCHIVADO: 2 };

/** Días del menú que caen en la semana que empieza en `lunes` (0 si no se solapan). */
export function diasEnSemana(menu: Pick<MenuResumenResponse, 'fechaInicio' | 'fechaFin'>, lunes: string): number {
  const domingo = sumarDias(lunes, 6);
  const inicio = menu.fechaInicio > lunes ? menu.fechaInicio : lunes;
  const fin = menu.fechaFin < domingo ? menu.fechaFin : domingo;
  return inicio > fin ? 0 : rangoDias(inicio, fin).length;
}

/**
 * Menús que tienen algún día en la semana de `lunes`, del preferido al menos preferido: primero los
 * ACTIVO (luego BORRADOR y ARCHIVADO), después los que cubren más días de la semana y, a igualdad,
 * el que empieza más tarde.
 */
export function menusDeLaSemana(menus: readonly MenuResumenResponse[], lunes: string): MenuResumenResponse[] {
  return menus
    .map((m) => ({ m, dias: diasEnSemana(m, lunes) }))
    .filter(({ dias }) => dias > 0)
    .sort(
      (a, b) =>
        PRIORIDAD_ESTADO[a.m.estado] - PRIORIDAD_ESTADO[b.m.estado] ||
        b.dias - a.dias ||
        b.m.fechaInicio.localeCompare(a.m.fechaInicio),
    )
    .map(({ m }) => m);
}

/**
 * Estado del planificador de menús (docs/api/menus.md §7.5). Se provee en el componente:
 * `providers: [PlanificadorStore]`.
 *
 * - `menus`: resúmenes de los menús cercanos a la semana visible (GET /menus?desde=, ver
 *   `desdeParaSemana`); `semana`: lunes de la semana visible.
 * - Al cargar o cambiar de semana se elige el menú preferido de esa semana (`menusDeLaSemana`) y se
 *   pide su detalle; si no hay ninguno, `menu` queda en null.
 * - `reemplazarMenu` aplica tal cual el `MenuResponse` que devuelve el servidor tras una edición:
 *   el cliente no recalcula nutrientes, objetivos ni porcentajes.
 */
@Injectable()
export class PlanificadorStore {
  private readonly menusService = inject(MenusService);

  readonly menus = signal<MenuResumenResponse[]>([]);
  readonly menu = signal<MenuResponse | null>(null);
  /** Lunes de la semana visible ("AAAA-MM-DD"). */
  readonly semana = signal(lunesDeLaSemana(hoyLocal()));
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  /** Domingo de la semana visible. */
  readonly finSemana = computed(() => sumarDias(this.semana(), 6));
  /** Las 7 fechas de la semana visible, de lunes a domingo. */
  readonly diasSemana = computed(() => rangoDias(this.semana(), this.finSemana()));
  /** Menús con algún día en la semana visible, el preferido primero. */
  readonly menusSemana = computed(() => menusDeLaSemana(this.menus(), this.semana()));

  private peticionLista?: Subscription;
  private peticionDetalle?: Subscription;

  /**
   * Pide los menús de la semana visible y selecciona `preferido` (si está en la semana) o el
   * preferido por `menusDeLaSemana`.
   */
  cargar(preferido?: string): void {
    this.cancelar();
    this.cargando.set(true);
    this.error.set(null);
    const desde = desdeParaSemana(this.semana());
    this.peticionLista = this.menusService.listar({ desde, page: 0, size: MENUS_POR_PAGINA }).subscribe({
      next: (pagina) => {
        this.menus.set(pagina.content);
        this.seleccionarDeLaSemana(preferido);
      },
      error: (e: unknown) => this.fallo(e),
    });
  }

  /** Muestra la semana de `fecha` (cualquier día: se pasa a su lunes), pide sus menús y selecciona uno. */
  irASemana(fecha: string): void {
    const lunes = lunesDeLaSemana(fecha);
    if (lunes === this.semana()) return;
    this.semana.set(lunes);
    this.cargar();
  }

  semanaAnterior(): void {
    this.irASemana(sumarDias(this.semana(), -7));
  }

  semanaSiguiente(): void {
    this.irASemana(sumarDias(this.semana(), 7));
  }

  /** Pide el detalle de un menú y lo selecciona (cancela la petición anterior, si la hay). */
  seleccionar(id: string): void {
    this.peticionDetalle?.unsubscribe();
    this.cargando.set(true);
    this.error.set(null);
    this.peticionDetalle = this.menusService.detalle(id).subscribe({
      next: (menu) => {
        this.menu.set(menu);
        this.cargando.set(false);
      },
      error: (e: unknown) => this.fallo(e),
    });
  }

  /**
   * Aplica el menú que devuelve el servidor (editado, generado, duplicado…): pasa a ser el
   * seleccionado, se actualiza (o se añade) su resumen y, si no cae en la semana visible, se va a la
   * semana en que empieza (y se piden los menús de esa semana, sin cambiar la selección).
   */
  reemplazarMenu(menu: MenuResponse): void {
    this.peticionDetalle?.unsubscribe();
    this.cargando.set(false);
    this.error.set(null);
    this.menu.set(menu);
    this.menus.update((menus) => {
      const resumen = aResumen(menu);
      const existe = menus.some((m) => m.id === menu.id);
      const nuevos = existe ? menus.map((m) => (m.id === menu.id ? resumen : m)) : [...menus, resumen];
      return nuevos.sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
    });
    if (diasEnSemana(menu, this.semana()) === 0) {
      this.semana.set(lunesDeLaSemana(menu.fechaInicio));
      this.cargar(menu.id);
    }
  }

  /** Quita un menú eliminado; si era el seleccionado, selecciona otro de la semana (o ninguno). */
  quitarMenu(id: string): void {
    this.menus.update((menus) => menus.filter((m) => m.id !== id));
    if (this.menu()?.id !== id) return;
    this.menu.set(null);
    this.seleccionarDeLaSemana();
  }

  private seleccionarDeLaSemana(preferido?: string): void {
    const semana = this.menusSemana();
    const elegido = semana.find((m) => m.id === preferido) ?? semana[0];
    if (!elegido) {
      this.peticionDetalle?.unsubscribe();
      this.menu.set(null);
      this.cargando.set(false);
      return;
    }
    if (this.menu()?.id === elegido.id) {
      this.cargando.set(false);
      return;
    }
    this.seleccionar(elegido.id);
  }

  private fallo(e: unknown): void {
    this.error.set(aApiError(e).detalle);
    this.cargando.set(false);
  }

  private cancelar(): void {
    this.peticionLista?.unsubscribe();
    this.peticionDetalle?.unsubscribe();
  }
}

function aResumen(menu: MenuResponse): MenuResumenResponse {
  return {
    id: menu.id,
    nombre: menu.nombre,
    tipo: menu.tipo,
    fechaInicio: menu.fechaInicio,
    fechaFin: menu.fechaFin,
    favorito: menu.favorito,
    estado: menu.estado,
    generadoAutomaticamente: menu.generadoAutomaticamente,
    numeroComidas: menu.dias.reduce((n, d) => n + d.comidas.length, 0),
  };
}
