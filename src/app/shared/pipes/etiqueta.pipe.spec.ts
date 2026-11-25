import { EtiquetaPipe } from './etiqueta.pipe';

describe('EtiquetaPipe', () => {
  const pipe = new EtiquetaPipe();

  it('traduce el valor con el mapa indicado', () => {
    expect(pipe.transform('MEDIA_MANANA', 'tipoComida')).toBe('Media mañana');
    expect(pipe.transform('COMPETICION', 'objetivo')).toBe('Preparar una competición');
    expect(pipe.transform('FRUTOS_DE_CASCARA', 'alergeno')).toBe('Frutos de cáscara');
    expect(pipe.transform('ADMIN', 'fuenteAlimento')).toBe('NutriSport');
    expect(pipe.transform('ADMIN', 'rol')).toBe('Administrador');
    expect(pipe.transform('UD', 'unidadCompra')).toBe('ud.');
  });

  it('devuelve el valor tal cual si no tiene etiqueta', () => {
    expect(pipe.transform('VALOR_NUEVO', 'tipoComida')).toBe('VALOR_NUEVO');
    // Un valor de otro enumerado tampoco se traduce.
    expect(pipe.transform('GLUTEN', 'tipoComida')).toBe('GLUTEN');
  });

  it('devuelve "—" sin dato', () => {
    expect(pipe.transform(null, 'tipoComida')).toBe('—');
    expect(pipe.transform(undefined, 'sexo')).toBe('—');
  });
});
