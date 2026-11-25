import { aHoraApi } from '@core/util/fechas';

import { FechaCortaPipe } from './fecha-corta.pipe';

describe('FechaCortaPipe', () => {
  const pipe = new FechaCortaPipe();

  describe('con una fecha "AAAA-MM-DD"', () => {
    it('\'corta\' por defecto (DESIGN.md §11: "sáb. 21 nov")', () => {
      expect(pipe.transform('2026-11-21')).toBe('sáb. 21 nov');
      expect(pipe.transform('2026-11-21', 'corta')).toBe('sáb. 21 nov');
      expect(pipe.transform('2026-11-25')).toBe('mié. 25 nov');
    });

    it("'larga'", () => {
      expect(pipe.transform('2026-11-21', 'larga')).toBe('sábado, 21 de noviembre');
    });

    it("'diaMes'", () => {
      expect(pipe.transform('2026-11-21', 'diaMes')).toBe('21 nov');
      expect(pipe.transform('2026-01-05', 'diaMes')).toBe('5 ene');
    });

    it('la interpreta como fecha local: no cambia de día (1 de enero, cambio de hora)', () => {
      expect(pipe.transform('2027-01-01', 'larga')).toBe('viernes, 1 de enero');
      expect(pipe.transform('2026-10-25', 'larga')).toBe('domingo, 25 de octubre');
    });
  });

  describe('con un ISO con hora', () => {
    it('formatea la fecha y la hora locales de 24 h', () => {
      // Sin zona, el ISO se interpreta en hora local: el resultado no depende de la zona del equipo.
      expect(pipe.transform('2026-11-21T08:30:00', 'corta')).toBe('sáb. 21 nov');
      expect(pipe.transform('2026-11-21T08:30:00', 'hora')).toBe('08:30');
      expect(pipe.transform('2026-11-21T18:05:00', 'hora')).toBe('18:05');
    });

    it('con zona, muestra la hora en la zona del navegador', () => {
      const iso = '2026-11-21T08:30:00+01:00';
      expect(pipe.transform(iso, 'hora')).toBe(aHoraApi(new Date(iso)));
    });
  });

  it('acepta las horas sueltas de la API con \'hora\' ("08:30:00" → "08:30")', () => {
    expect(pipe.transform('08:30:00', 'hora')).toBe('08:30');
    expect(pipe.transform('21:15', 'hora')).toBe('21:15');
  });

  it('devuelve "—" sin dato o con una fecha no válida', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform('')).toBe('—');
    expect(pipe.transform('2026-02-30')).toBe('—');
    expect(pipe.transform('no es una fecha')).toBe('—');
  });
});
