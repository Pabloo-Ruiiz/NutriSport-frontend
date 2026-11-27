import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, map } from 'rxjs';

import { CONSULTAS, LayoutService } from './layout.service';

/** Simula el ancho de la ventana y responde a las consultas de LayoutService. */
class BreakpointObserverFalso {
  readonly ancho = new BehaviorSubject<number>(360);

  private cumple(consulta: string, ancho: number): boolean {
    switch (consulta) {
      case CONSULTAS.movil:
        return ancho < 768;
      case CONSULTAS.tablet:
        return ancho >= 768 && ancho < 1024;
      case CONSULTAS.escritorio:
        return ancho >= 1024;
      case CONSULTAS.xl:
        return ancho >= 1280;
      default:
        throw new Error(`Consulta no esperada: ${consulta}`);
    }
  }

  observe(consulta: string): Observable<BreakpointState> {
    return this.ancho.pipe(
      map((ancho) => {
        const matches = this.cumple(consulta, ancho);
        return { matches, breakpoints: { [consulta]: matches } };
      }),
    );
  }

  isMatched(consulta: string): boolean {
    return this.cumple(consulta, this.ancho.value);
  }
}

describe('LayoutService', () => {
  let observer: BreakpointObserverFalso;
  let servicio: LayoutService;

  beforeEach(() => {
    observer = new BreakpointObserverFalso();
    TestBed.configureTestingModule({
      providers: [{ provide: BreakpointObserver, useValue: observer }],
    });
    servicio = TestBed.inject(LayoutService);
  });

  const estado = () => [servicio.esMovil(), servicio.esTablet(), servicio.esEscritorio()];

  it('detecta móvil por debajo de 768 px', () => {
    observer.ancho.next(360);
    expect(estado()).toEqual([true, false, false]);
    observer.ancho.next(767);
    expect(estado()).toEqual([true, false, false]);
  });

  it('detecta tablet de 768 a 1023 px', () => {
    observer.ancho.next(768);
    expect(estado()).toEqual([false, true, false]);
    observer.ancho.next(1023);
    expect(estado()).toEqual([false, true, false]);
  });

  it('detecta escritorio desde 1024 px', () => {
    observer.ancho.next(1024);
    expect(estado()).toEqual([false, false, true]);
    observer.ancho.next(1920);
    expect(estado()).toEqual([false, false, true]);
  });

  it('esXl desde 1280 px (tercer panel)', () => {
    observer.ancho.next(1279);
    expect(servicio.esXl()).toBe(false);
    observer.ancho.next(1280);
    expect(servicio.esXl()).toBe(true);
  });

  it('usa las mismas cifras que los mixins de SCSS', () => {
    expect(CONSULTAS.movil).toBe('(max-width: 767.98px)');
    expect(CONSULTAS.tablet).toBe('(min-width: 768px) and (max-width: 1023.98px)');
    expect(CONSULTAS.escritorio).toBe('(min-width: 1024px)');
    expect(CONSULTAS.xl).toBe('(min-width: 1280px)');
  });
});
