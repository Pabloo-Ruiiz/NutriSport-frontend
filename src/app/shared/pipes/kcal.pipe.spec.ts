import { KcalPipe } from './kcal.pipe';

// Entre la cifra y la unidad va un espacio que no se parte (U+00A0).
describe('KcalPipe', () => {
  const pipe = new KcalPipe();

  it('formatea con separador de miles y la unidad (DESIGN.md §11: "2.450 kcal")', () => {
    expect(pipe.transform(2450)).toBe('2.450 kcal');
    expect(pipe.transform(12345)).toBe('12.345 kcal');
  });

  it('redondea a entero', () => {
    expect(pipe.transform(319.6)).toBe('320 kcal');
    expect(pipe.transform(0)).toBe('0 kcal');
  });

  it('muestra los negativos (p. ej. kcal restantes)', () => {
    expect(pipe.transform(-320)).toBe('-320 kcal');
  });

  it('devuelve "—" sin dato', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform(Number.NaN)).toBe('—');
  });
});
