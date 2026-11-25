import { GramosPipe } from './gramos.pipe';

describe('GramosPipe', () => {
  const pipe = new GramosPipe();

  it('por defecto no muestra decimales (DESIGN.md §11: "112 g")', () => {
    expect(pipe.transform(112)).toBe('112 g');
    expect(pipe.transform(112.4)).toBe('112 g');
    expect(pipe.transform(1500)).toBe('1.500 g');
  });

  it('admite decimales con coma ("1,5 g")', () => {
    expect(pipe.transform(1.5, 1)).toBe('1,5 g');
    expect(pipe.transform(2, 1)).toBe('2,0 g');
    expect(pipe.transform(0.25, 2)).toBe('0,25 g');
  });

  it('devuelve "—" sin dato', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined, 1)).toBe('—');
  });
});
