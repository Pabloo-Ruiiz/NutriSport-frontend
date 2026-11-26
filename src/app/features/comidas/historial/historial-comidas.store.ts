import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, Subscription, forkJoin, map, of } from 'rxjs';

import type { ComidasDiaResponse, OrigenComida, RegistroComidaResponse, TipoComida } from '@core/models';
import { ComidasService, MAX_DIAS_HISTORIAL } from '@core/services/comidas.service';
import { aApiError } from '@core/util/api-error';
import { hoyLocal, sumarDias } from '@core/util/fechas';

/** Días que se cargan por defecto y con cada "Cargar 30 días más". */
export const DIAS_POR_TRAMO = 30;

export interface FiltrosHistorial {
  desde: string; // "AAAA-MM-DD"
  hasta: string;
  /** Se filtra en el servidor (parámetro `tipo`). */
  tipo: TipoComida | null;
  /** Se filtra en el cliente; vacío = todos. */
  origenes: OrigenComida[];
}

export interface DiaHistorial {
  fecha: string;
  comidas: RegistroComidaResponse[];
  /** Suma de las comidas que se ven (con el filtro de origen aplicado). */
  kcal: number;
}

export function filtrosPorDefecto(): FiltrosHistorial {
  const hoy = hoyLocal();
  return { desde: sumarDias(hoy, -(DIAS_POR_TRAMO - 1)), hasta: hoy, tipo: null, origenes: [] };
}

type Estado = 'cargando' | 'error' | 'listo';

/**
 * Estado del historial de comidas (DESIGN.md §7.9): filtros, días cargados (de `desdeCargado` a
 * `filtros.hasta`), filtro de origen en el cliente y resumen del periodo. "Cargar más" amplía el
 * rango hacia atrás sin volver a pedir lo ya cargado.
 */
@Injectable()
export class HistorialComidasStore {
  private readonly comidasService = inject(ComidasService);

  readonly filtros = signal<FiltrosHistorial>(filtrosPorDefecto());
  /** Primer día cargado: `filtros.desde` o antes, tras "Cargar más". */
  readonly desdeCargado = signal(this.filtros().desde);
  readonly estado = signal<Estado>('cargando');
  readonly error = signal<string | null>(null);
  readonly cargandoMas = signal(false);

  private readonly dias = signal<ComidasDiaResponse[]>([]);
  private peticion?: Subscription;
  private peticionMas?: Subscription;

  /** Días con alguna comida visible, del más reciente al más antiguo. */
  readonly diasVisibles = computed<DiaHistorial[]>(() => {
    const origenes = new Set(this.filtros().origenes);
    return this.dias()
      .map((d) => {
        const comidas = origenes.size ? d.comidas.filter((c) => origenes.has(c.origen)) : d.comidas;
        return { fecha: d.fecha, comidas, kcal: comidas.reduce((s, c) => s + c.totales.kcal, 0) };
      })
      .filter((d) => d.comidas.length > 0)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  });

  /** Media de kcal por día con comidas y días registrados, de lo que se ve. */
  readonly resumen = computed(() => {
    const dias = this.diasVisibles();
    const total = dias.reduce((s, d) => s + d.kcal, 0);
    return { diasRegistrados: dias.length, mediaKcal: dias.length ? total / dias.length : 0 };
  });

  readonly hayFiltros = computed(() => this.filtros().tipo !== null || this.filtros().origenes.length > 0);

  /** Cambia los filtros. Solo se vuelve a pedir al servidor si cambian las fechas o el tipo. */
  aplicarFiltros(nuevos: FiltrosHistorial): void {
    const antes = this.filtros();
    this.filtros.set(nuevos);
    if (nuevos.desde !== antes.desde || nuevos.hasta !== antes.hasta || nuevos.tipo !== antes.tipo) this.cargar();
  }

  cargar(): void {
    this.peticion?.unsubscribe();
    this.peticionMas?.unsubscribe();
    this.cargandoMas.set(false);
    const { desde, hasta, tipo } = this.filtros();
    this.desdeCargado.set(desde);
    this.estado.set('cargando');
    this.error.set(null);
    this.peticion = this.pedir(desde, hasta, tipo).subscribe({
      next: (dias) => {
        this.dias.set(dias);
        this.estado.set('listo');
      },
      error: (e: unknown) => {
        this.error.set(aApiError(e).detalle);
        this.estado.set('error');
      },
    });
  }

  /** Amplía el rango 30 días hacia atrás. Devuelve el error, si lo hay, para avisar. */
  cargarMas(): Observable<void> {
    const hasta = sumarDias(this.desdeCargado(), -1);
    const desde = sumarDias(this.desdeCargado(), -DIAS_POR_TRAMO);
    this.cargandoMas.set(true);
    return new Observable<void>((sub) => {
      this.peticionMas = this.pedir(desde, hasta, this.filtros().tipo).subscribe({
        next: (nuevos) => {
          this.dias.update((dias) => fusionar(dias, nuevos));
          this.desdeCargado.set(desde);
          this.cargandoMas.set(false);
          sub.next();
          sub.complete();
        },
        error: (e: unknown) => {
          this.cargandoMas.set(false);
          sub.error(e);
        },
      });
      return () => this.peticionMas?.unsubscribe();
    });
  }

  /** Quita una comida al momento (al eliminarla). */
  quitar(id: string): void {
    this.dias.update((dias) =>
      dias.map((d) =>
        d.comidas.some((c) => c.id === id) ? { ...d, comidas: d.comidas.filter((c) => c.id !== id) } : d,
      ),
    );
  }

  /**
   * Añade una comida (duplicada, recuperada o devuelta tras un error) si cae en el rango cargado y
   * cumple el filtro de tipo. Se coloca en su día por hora.
   */
  insertar(comida: RegistroComidaResponse): void {
    const { hasta, tipo } = this.filtros();
    if (comida.fecha < this.desdeCargado() || comida.fecha > hasta) return;
    if (tipo && comida.tipoComida !== tipo) return;
    this.dias.update((dias) => fusionar(dias, [{ fecha: comida.fecha, comidas: [comida], totales: comida.totales }]));
  }

  /**
   * GET /comidas en tramos de como mucho 92 días (tras varios "Cargar más" el rango puede ser mayor).
   */
  private pedir(desde: string, hasta: string, tipo: TipoComida | null): Observable<ComidasDiaResponse[]> {
    const tramos: Observable<ComidasDiaResponse[]>[] = [];
    for (let fin = hasta; fin >= desde; fin = sumarDias(fin, -MAX_DIAS_HISTORIAL)) {
      const inicio = sumarDias(fin, -(MAX_DIAS_HISTORIAL - 1));
      tramos.push(this.comidasService.historial(inicio < desde ? desde : inicio, fin, tipo));
    }
    return tramos.length ? forkJoin(tramos).pipe(map((r) => r.flat())) : of([]);
  }
}

/** Une días por fecha, sin repetir comidas, con las de cada día ordenadas por hora. */
function fusionar(dias: ComidasDiaResponse[], nuevos: ComidasDiaResponse[]): ComidasDiaResponse[] {
  const porFecha = new Map(dias.map((d) => [d.fecha, d]));
  for (const nuevo of nuevos) {
    const actual = porFecha.get(nuevo.fecha);
    if (!actual) {
      porFecha.set(nuevo.fecha, nuevo);
      continue;
    }
    const ids = new Set(actual.comidas.map((c) => c.id));
    const comidas = [...actual.comidas, ...nuevo.comidas.filter((c) => !ids.has(c.id))].sort((a, b) =>
      (a.hora ?? '99').localeCompare(b.hora ?? '99'),
    );
    porFecha.set(nuevo.fecha, { ...actual, comidas });
  }
  return [...porFecha.values()];
}
