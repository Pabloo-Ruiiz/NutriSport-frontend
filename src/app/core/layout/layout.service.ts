import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable, Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/** Breakpoints en px (DESIGN.md §9.2), los mismos que $ns-breakpoints en abstracts/_breakpoints.scss. */
export const BREAKPOINTS = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/** Media queries equivalentes a los mixins up() y down() de SCSS (down() resta 0,02 px). */
export const CONSULTAS = {
  movil: `(max-width: ${BREAKPOINTS.md - 0.02}px)`,
  tablet: `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 0.02}px)`,
  escritorio: `(min-width: ${BREAKPOINTS.lg}px)`,
} as const;

/**
 * Estado del tamaño de pantalla. Decide si se muestra la barra inferior (móvil),
 * la sidebar colapsada (tablet) o la sidebar expandida (escritorio) (DESIGN.md §6.3).
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly observer = inject(BreakpointObserver);

  /** Menos de 768 px: barra inferior y drawer. */
  readonly esMovil = this.consulta(CONSULTAS.movil);

  /** De 768 a 1023 px: sidebar colapsada. */
  readonly esTablet = this.consulta(CONSULTAS.tablet);

  /** 1024 px o más: sidebar expandida. */
  readonly esEscritorio = this.consulta(CONSULTAS.escritorio);

  private consulta(mediaQuery: string): Signal<boolean> {
    return toSignal(this.observer.observe(mediaQuery).pipe(map((estado) => estado.matches)), {
      initialValue: this.observer.isMatched(mediaQuery),
    });
  }
}
