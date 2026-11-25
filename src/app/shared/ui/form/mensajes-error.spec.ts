import { mensajeError, primerMensajeError } from './mensajes-error';

describe('mensajes de error', () => {
  it('traduce los validadores de Angular', () => {
    expect(mensajeError('required', true)).toBe('Este campo es obligatorio.');
    expect(mensajeError('email', true)).toContain('correo electrónico válido');
    expect(mensajeError('minlength', { requiredLength: 8, actualLength: 3 })).toBe('Escribe al menos 8 caracteres.');
    expect(mensajeError('maxlength', { requiredLength: 50, actualLength: 60 })).toBe(
      'Escribe como máximo 50 caracteres.',
    );
    expect(mensajeError('pattern', { requiredPattern: '^\\d+$', actualValue: 'a' })).toBe('El formato no es válido.');
  });

  it('formatea los límites de min y max en español', () => {
    expect(mensajeError('min', { min: 30, actual: 10 })).toBe('El valor mínimo es 30.');
    expect(mensajeError('max', { max: 2500, actual: 3000 })).toBe('El valor máximo es 2.500.');
    expect(mensajeError('min', { min: 0.5, actual: 0 })).toBe('El valor mínimo es 0,5.');
  });

  it('muestra el texto del servidor tal cual', () => {
    expect(mensajeError('servidor', 'Ya existe una cuenta con este correo.')).toBe(
      'Ya existe una cuenta con este correo.',
    );
    expect(mensajeError('servidor', ['Uno.', 'Dos.'])).toBe('Uno. Dos.');
    expect(mensajeError('servidor', true)).toBe('El valor no es válido.');
  });

  it('usa un mensaje genérico para errores desconocidos', () => {
    expect(mensajeError('fechaFutura', true)).toBe('El valor no es válido.');
  });

  it('devuelve el primer error, con prioridad para el del servidor', () => {
    expect(primerMensajeError(null)).toBeNull();
    expect(primerMensajeError({})).toBeNull();
    expect(primerMensajeError({ required: true, email: true })).toBe('Este campo es obligatorio.');
    expect(primerMensajeError({ email: true, servidor: 'Correo ya registrado.' })).toBe('Correo ya registrado.');
  });
});
