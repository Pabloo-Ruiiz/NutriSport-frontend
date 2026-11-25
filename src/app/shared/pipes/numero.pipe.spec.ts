import { NumeroPipe } from './numero.pipe';

describe('NumeroPipe', () => {
  const pipe = new NumeroPipe();

  it('usa coma decimal ("72,4") y el número de decimales indicado', () => {
    expect(pipe.transform(72.4, 1)).toBe('72,4');
    expect(pipe.transform(72, 1)).toBe('72,0');
    expect(pipe.transform(1.5, 1)).toBe('1,5'); // "1,5 kg" en DESIGN.md §11
    expect(pipe.transform(72.46, 1)).toBe('72,5');
  });

  it('por defecto no muestra decimales y agrupa los miles con punto', () => {
    expect(pipe.transform(72.4)).toBe('72');
    expect(pipe.transform(2450)).toBe('2.450');
    expect(pipe.transform(1234567)).toBe('1.234.567');
  });

  it('devuelve "—" sin dato', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
  });
});
