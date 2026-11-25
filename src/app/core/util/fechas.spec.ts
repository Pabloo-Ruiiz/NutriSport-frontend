import {
  aFechaApi,
  aHoraApi,
  desdeFechaApi,
  diasEntre,
  hoyLocal,
  lunesDeLaSemana,
  rangoDias,
  sumarDias,
} from './fechas';

// El servidor trabaja en Europe/Madrid: las pruebas usan esa zona para que el
// cambio de hora (último domingo de octubre: 25/10/2026) se compruebe de verdad.
beforeAll(() => {
  vi.stubEnv('TZ', 'Europe/Madrid');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('fechas', () => {
  it('usa la zona Europe/Madrid en las pruebas (hay cambio de hora el 25/10/2026)', () => {
    const antes = new Date(2026, 9, 24, 12).getTimezoneOffset();
    const despues = new Date(2026, 9, 26, 12).getTimezoneOffset();
    expect(antes).toBe(-120);
    expect(despues).toBe(-60);
  });

  describe('aFechaApi', () => {
    it('formatea con los componentes locales y ceros a la izquierda', () => {
      expect(aFechaApi(new Date(2026, 0, 5, 9, 0))).toBe('2026-01-05');
    });

    it('no se va al día anterior justo después de medianoche (toISOString sí lo haría)', () => {
      const d = new Date(2026, 10, 25, 0, 30);
      expect(aFechaApi(d)).toBe('2026-11-25');
      expect(d.toISOString().slice(0, 10)).toBe('2026-11-24');
    });
  });

  describe('desdeFechaApi', () => {
    it('devuelve el día local a mediodía', () => {
      const d = desdeFechaApi('2026-11-25');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(10);
      expect(d.getDate()).toBe(25);
      expect(d.getHours()).toBe(12);
    });

    it('es la inversa de aFechaApi, también el día del cambio de hora', () => {
      expect(aFechaApi(desdeFechaApi('2026-10-25'))).toBe('2026-10-25');
      expect(aFechaApi(desdeFechaApi('2026-03-29'))).toBe('2026-03-29');
    });

    it('rechaza formatos y fechas que no existen', () => {
      expect(() => desdeFechaApi('25/11/2026')).toThrow();
      expect(() => desdeFechaApi('2026-2-1')).toThrow();
      expect(() => desdeFechaApi('2026-02-30')).toThrow();
      expect(() => desdeFechaApi('2026-02-29')).toThrow();
    });
  });

  describe('hoyLocal', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('devuelve la fecha local aunque en UTC aún sea el día anterior', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 10, 25, 0, 15));
      expect(hoyLocal()).toBe('2026-11-25');
    });
  });

  describe('sumarDias', () => {
    it('suma y resta días dentro del mes', () => {
      expect(sumarDias('2026-11-21', 3)).toBe('2026-11-24');
      expect(sumarDias('2026-11-21', -3)).toBe('2026-11-18');
      expect(sumarDias('2026-11-21', 0)).toBe('2026-11-21');
    });

    it('cambia de mes y de año', () => {
      expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
      expect(sumarDias('2026-12-01', -1)).toBe('2026-11-30');
      expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
      expect(sumarDias('2027-01-01', -1)).toBe('2026-12-31');
    });

    it('respeta el 29 de febrero de los años bisiestos', () => {
      expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
      expect(sumarDias('2028-02-29', 1)).toBe('2028-03-01');
      expect(sumarDias('2028-03-01', -1)).toBe('2028-02-29');
      expect(sumarDias('2026-02-28', 1)).toBe('2026-03-01');
    });

    it('no pierde ni repite días con el cambio de hora de finales de octubre', () => {
      expect(sumarDias('2026-10-24', 1)).toBe('2026-10-25');
      expect(sumarDias('2026-10-25', 1)).toBe('2026-10-26');
      expect(sumarDias('2026-10-26', -1)).toBe('2026-10-25');
      expect(sumarDias('2026-10-20', 7)).toBe('2026-10-27');
    });
  });

  describe('lunesDeLaSemana', () => {
    it('devuelve el lunes de la semana (de lunes a domingo)', () => {
      expect(lunesDeLaSemana('2026-11-23')).toBe('2026-11-23'); // lunes
      expect(lunesDeLaSemana('2026-11-25')).toBe('2026-11-23'); // miércoles
      expect(lunesDeLaSemana('2026-11-29')).toBe('2026-11-23'); // domingo
    });

    it('retrocede al mes anterior si hace falta', () => {
      expect(lunesDeLaSemana('2026-12-02')).toBe('2026-11-30');
    });

    it('funciona en la semana del cambio de hora', () => {
      expect(lunesDeLaSemana('2026-10-25')).toBe('2026-10-19'); // domingo del cambio
      expect(lunesDeLaSemana('2026-10-26')).toBe('2026-10-26');
    });
  });

  describe('diasEntre', () => {
    it('cuenta días naturales, con signo', () => {
      expect(diasEntre('2026-11-21', '2026-11-21')).toBe(0);
      expect(diasEntre('2026-11-21', '2026-11-28')).toBe(7);
      expect(diasEntre('2026-11-28', '2026-11-21')).toBe(-7);
    });

    it('cruza meses y años bisiestos', () => {
      expect(diasEntre('2026-11-30', '2026-12-01')).toBe(1);
      expect(diasEntre('2028-02-28', '2028-03-01')).toBe(2);
      expect(diasEntre('2028-01-01', '2029-01-01')).toBe(366);
      expect(diasEntre('2026-01-01', '2027-01-01')).toBe(365);
    });

    it('no se ve afectado por el día de 25 horas', () => {
      expect(diasEntre('2026-10-24', '2026-10-26')).toBe(2);
      expect(diasEntre('2026-10-25', '2026-10-26')).toBe(1);
    });
  });

  describe('rangoDias', () => {
    it('incluye las dos fechas extremas', () => {
      expect(rangoDias('2026-11-23', '2026-11-25')).toEqual(['2026-11-23', '2026-11-24', '2026-11-25']);
    });

    it('devuelve un solo día o ninguno', () => {
      expect(rangoDias('2026-11-25', '2026-11-25')).toEqual(['2026-11-25']);
      expect(rangoDias('2026-11-26', '2026-11-25')).toEqual([]);
    });

    it('cruza el fin de febrero de un año bisiesto', () => {
      expect(rangoDias('2028-02-27', '2028-03-01')).toEqual(['2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01']);
    });

    it('cruza el cambio de hora sin huecos ni duplicados', () => {
      expect(rangoDias('2026-10-24', '2026-10-27')).toEqual(['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27']);
    });
  });

  describe('aHoraApi', () => {
    it('formatea la hora local como HH:mm', () => {
      expect(aHoraApi(new Date(2026, 10, 25, 8, 5))).toBe('08:05');
      expect(aHoraApi(new Date(2026, 10, 25, 23, 59, 59))).toBe('23:59');
      expect(aHoraApi(new Date(2026, 10, 25, 0, 0))).toBe('00:00');
    });
  });
});
