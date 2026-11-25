import { FormControl, FormGroup, Validators } from '@angular/forms';

import { mensajeError, primerMensajeError } from '@shared/ui/form/mensajes-error';
import { casillaMarcada, coincideCon, contrasenaSegura, motivoContrasena, noSoloEspacios } from './validadores';

describe('contrasenaSegura', () => {
  const validar = (valor: unknown) => contrasenaSegura()(new FormControl(valor));

  it('acepta 10–72 caracteres con al menos una letra y un número', () => {
    expect(validar('abcdefghi1')).toBeNull();
    expect(validar('Ñandú 2024 corre')).toBeNull();
    expect(validar('a1' + 'x'.repeat(70))).toBeNull(); // 72
  });

  it('indica el motivo del primer fallo', () => {
    expect(validar('abc12345')).toEqual({ contrasenaSegura: { motivo: 'corta' } });
    expect(validar('a1' + 'x'.repeat(71))).toEqual({ contrasenaSegura: { motivo: 'larga' } });
    expect(validar('1234567890')).toEqual({ contrasenaSegura: { motivo: 'sinLetra' } });
    expect(validar('abcdefghij')).toEqual({ contrasenaSegura: { motivo: 'sinNumero' } });
  });

  it('la longitud se comprueba antes que el contenido', () => {
    expect(motivoContrasena('abc')).toBe('corta');
    expect(motivoContrasena('')).toBe('corta');
  });

  it('un valor vacío o que no es texto lo deja a Validators.required', () => {
    expect(validar('')).toBeNull();
    expect(validar(null)).toBeNull();
    expect(new FormControl('', [Validators.required, contrasenaSegura()]).errors).toEqual({ required: true });
  });
});

describe('coincideCon', () => {
  it('compara con otro control', () => {
    const password = new FormControl('secreta1234');
    const confirmar = new FormControl('secreta1234', coincideCon(password));
    expect(confirmar.errors).toBeNull();

    confirmar.setValue('otra');
    expect(confirmar.errors).toEqual({ coincideCon: true });
  });

  it('admite una función, para declararlo dentro del FormGroup', () => {
    // Como en un componente (this.form?.…): mientras se crea el grupo, la referencia aún no existe.
    let form: FormGroup<{ password: FormControl<string>; confirmar: FormControl<string> }> | undefined;
    form = new FormGroup({
      password: new FormControl('secreta1234', { nonNullable: true }),
      confirmar: new FormControl('secreta1234', {
        nonNullable: true,
        validators: coincideCon(() => form?.controls.password),
      }),
    });
    expect(form.controls.confirmar.errors).toBeNull();
    form.controls.confirmar.setValue('secreta1234');
    expect(form.controls.confirmar.errors).toBeNull();

    // Cambiar el otro control no revalida solo: hay que pedirlo.
    form.controls.password.setValue('distinta1234');
    form.controls.confirmar.updateValueAndValidity();
    expect(form.controls.confirmar.errors).toEqual({ coincideCon: true });
  });

  it('vacío es válido y sin control de referencia no valida', () => {
    expect(coincideCon(new FormControl('x'))(new FormControl(''))).toBeNull();
    expect(coincideCon(() => null)(new FormControl('x'))).toBeNull();
  });
});

describe('noSoloEspacios', () => {
  const validar = (valor: unknown) => noSoloEspacios()(new FormControl(valor));

  it('rechaza un texto que solo tiene espacios', () => {
    expect(validar('   ')).toEqual({ noSoloEspacios: true });
    expect(validar('\t \n')).toEqual({ noSoloEspacios: true });
  });

  it('acepta texto con contenido, vacío o no textual', () => {
    expect(validar(' Ana ')).toBeNull();
    expect(validar('')).toBeNull();
    expect(validar(null)).toBeNull();
    expect(validar(42)).toBeNull();
  });
});

describe('casillaMarcada', () => {
  it('solo vale true', () => {
    expect(casillaMarcada()(new FormControl(true))).toBeNull();
    expect(casillaMarcada()(new FormControl(false))).toEqual({ requiredTrue: true });
    expect(casillaMarcada()(new FormControl(null))).toEqual({ requiredTrue: true });
    expect(primerMensajeError({ requiredTrue: true })).toBe('Debes marcar esta casilla para continuar.');
  });
});

describe('mensajes de los validadores', () => {
  it('explican cada motivo de contrasenaSegura', () => {
    expect(mensajeError('contrasenaSegura', { motivo: 'corta' })).toBe(
      'La contraseña debe tener al menos 10 caracteres.',
    );
    expect(mensajeError('contrasenaSegura', { motivo: 'larga' })).toBe(
      'La contraseña puede tener como máximo 72 caracteres.',
    );
    expect(mensajeError('contrasenaSegura', { motivo: 'sinLetra' })).toBe(
      'La contraseña debe incluir al menos una letra.',
    );
    expect(mensajeError('contrasenaSegura', { motivo: 'sinNumero' })).toBe(
      'La contraseña debe incluir al menos un número.',
    );
    expect(mensajeError('contrasenaSegura', {})).toBe('El valor no es válido.');
  });

  it('coincideCon y noSoloEspacios', () => {
    expect(primerMensajeError({ coincideCon: true })).toBe('Las contraseñas no coinciden.');
    expect(primerMensajeError({ noSoloEspacios: true })).toBe('Escribe algo más que espacios.');
  });

  it('el control muestra el mensaje del primer validador que falla', () => {
    const control = new FormControl('abc', [Validators.required, contrasenaSegura()]);
    expect(primerMensajeError(control.errors)).toBe('La contraseña debe tener al menos 10 caracteres.');
  });
});
