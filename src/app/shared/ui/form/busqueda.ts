import { DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Observable,
  Subject,
  catchError,
  debounce,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
  timer,
} from 'rxjs';

export type EstadoBusqueda = 'inactiva' | 'cargando' | 'resultados' | 'vacia' | 'error';

export interface OpcionesBusquedaReactiva {
  /** Caracteres mínimos (sin espacios en los extremos) para buscar. Por defecto 2. */
  minCaracteres?: () => number;
  /** Milisegundos de espera mientras se escribe. Por defecto 250. */
  debounceMs?: () => number;
}

interface Resultado<T> {
  estado: EstadoBusqueda;
  resultados: T[];
}

/**
 * Búsqueda mientras se escribe (NutriSport_API.md §7.2): debounce, distinctUntilChanged, mínimo de
 * caracteres y switchMap (una búsqueda nueva cancela la anterior, y su respuesta tardía no pisa la
 * nueva). Expone el estado como signals. Se crea en un contexto de inyección.
 *
 *   private readonly busqueda = new BusquedaReactiva((q) => this.alimentos.buscar(q).pipe(map((p) => p.content)));
 *   (input)="busqueda.escribir($any($event.target).value)"
 *   busqueda.estado() · busqueda.resultados() · busqueda.consulta()
 */
export class BusquedaReactiva<T> {
  private readonly entradas = new Subject<{ texto: string; intento: number }>();
  private intento = 0;
  private readonly resultado = signal<Resultado<T>>({ estado: 'inactiva', resultados: [] });

  /** Último texto escrito (sin recortar). */
  readonly texto = signal('');
  /** Texto que se está buscando, ya recortado. */
  readonly consulta = signal('');
  readonly estado = computed(() => this.resultado().estado);
  readonly resultados = computed(() => this.resultado().resultados);

  constructor(
    buscar: (texto: string) => Observable<T[]>,
    private readonly opciones: OpcionesBusquedaReactiva = {},
  ) {
    const min = () => this.opciones.minCaracteres?.() ?? 2;
    this.entradas
      .pipe(
        map(({ texto, intento }) => ({ consulta: texto.trim(), intento })),
        // debounce + timer (y no debounceTime) para leer el retraso en cada pulsación: puede venir de un input().
        debounce(() => timer(this.opciones.debounceMs?.() ?? 250)),
        // Mismo texto: no se repite la búsqueda, salvo que sea un reintento.
        distinctUntilChanged((a, b) => a.consulta === b.consulta && a.intento === b.intento),
        switchMap(({ consulta }): Observable<Resultado<T> & { consulta: string }> => {
          if (consulta.length < min()) return of({ consulta, estado: 'inactiva', resultados: [] });
          return buscar(consulta).pipe(
            map((resultados) => ({
              consulta,
              estado: resultados.length ? ('resultados' as const) : ('vacia' as const),
              resultados,
            })),
            catchError(() => of({ consulta, estado: 'error' as const, resultados: [] })),
            startWith({ consulta, estado: 'cargando' as const, resultados: this.resultados() }),
          );
        }),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(({ consulta, estado, resultados }) => {
        this.consulta.set(consulta);
        this.resultado.set({ estado, resultados });
      });
  }

  /** Texto nuevo del campo. Por debajo del mínimo se limpia ya, sin esperar al debounce. */
  escribir(texto: string): void {
    this.texto.set(texto);
    if (texto.trim().length < (this.opciones.minCaracteres?.() ?? 2)) {
      this.resultado.set({ estado: 'inactiva', resultados: [] });
    }
    this.entradas.next({ texto, intento: this.intento });
  }

  /** Vuelve al estado inicial (p. ej. tras elegir una opción). */
  limpiar(): void {
    this.escribir('');
  }

  /** Repite la última búsqueda (tras un error). */
  reintentar(): void {
    this.intento++;
    this.entradas.next({ texto: this.texto(), intento: this.intento });
  }
}
