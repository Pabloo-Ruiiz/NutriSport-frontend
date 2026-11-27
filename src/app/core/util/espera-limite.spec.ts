import { TestBed } from '@angular/core/testing';

import { EsperaLimite } from './espera-limite';

describe('EsperaLimite', () => {
  const crear = () => TestBed.runInInjectionContext(() => new EsperaLimite());

  afterEach(() => vi.restoreAllMocks());

  it('muestra los minutos exactos de Retry-After aunque el reloj avance al iniciar', () => {
    // Cada lectura del reloj avanza 1 ms, como bajo carga.
    let reloj = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => reloj++);

    const espera = crear();
    espera.iniciar(1800);

    expect(espera.mensaje()).toBe('Inténtalo de nuevo en 30 minutos.');
    expect(espera.activa()).toBe(true);
  });

  it('sin Retry-After no bloquea y pide intentarlo más tarde', () => {
    const espera = crear();
    espera.iniciar(null);

    expect(espera.activa()).toBe(false);
    expect(espera.mensaje()).toBe('Inténtalo de nuevo más tarde.');
  });

  it('limpiar() quita el aviso', () => {
    const espera = crear();
    espera.iniciar(60);
    espera.limpiar();

    expect(espera.activa()).toBe(false);
    expect(espera.mensaje()).toBeNull();
  });
});
