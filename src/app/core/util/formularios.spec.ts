import { HttpErrorResponse } from '@angular/common/http';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';

import { primerMensajeError } from '@shared/ui/form/mensajes-error';
import { aApiError } from './api-error';
import { aplicarErroresServidor, marcarTodoTocado, rutaDeCampo } from './formularios';

function errorValidacion(errors: { campo: string; mensaje: string }[]) {
  return aApiError(
    new HttpErrorResponse({
      status: 400,
      url: '/api/v1/auth/registro',
      error: {
        type: 'urn:nutrisport:error:validacion',
        title: 'Datos no válidos',
        status: 400,
        detail: 'Los datos enviados no son válidos',
        instance: '/api/v1/auth/registro',
        codigo: 'VALIDACION',
        errors,
      },
    }),
  );
}

function formularioRegistro() {
  return new FormGroup({
    email: new FormControl('ana@correo.com', [Validators.required, Validators.email]),
    password: new FormControl('corta', Validators.required),
    mayorDeEdad: new FormControl(false),
  });
}

describe('rutaDeCampo', () => {
  it('convierte índices y puntos en una ruta de Angular', () => {
    expect(rutaDeCampo('password')).toEqual(['password']);
    expect(rutaDeCampo('alimentos[0].cantidad')).toEqual(['alimentos', 0, 'cantidad']);
    expect(rutaDeCampo('menu.dias[3].comidas[1].receta')).toEqual(['menu', 'dias', 3, 'comidas', 1, 'receta']);
  });
});

describe('aplicarErroresServidor', () => {
  it('asigna los errores del registro incompleto a sus controles y los marca como tocados', () => {
    const form = formularioRegistro();
    const error = errorValidacion([
      { campo: 'mayorDeEdad', mensaje: 'Debes declarar que eres mayor de edad' },
      { campo: 'password', mensaje: 'Debe tener entre 10 y 72 caracteres' },
    ]);

    expect(aplicarErroresServidor(form, error)).toBe(true);

    const { password, mayorDeEdad, email } = form.controls;
    expect(password.errors).toEqual({ servidor: 'Debe tener entre 10 y 72 caracteres' });
    expect(password.touched).toBe(true);
    expect(mayorDeEdad.errors).toEqual({ servidor: 'Debes declarar que eres mayor de edad' });
    expect(email.errors).toBeNull();
    expect(email.touched).toBe(false);
    expect(form.invalid).toBe(true);
    // Es lo que mostrará ns-form-field / nsErrorCampo.
    expect(primerMensajeError(password.errors)).toBe('Debe tener entre 10 y 72 caracteres');
  });

  it('el error del servidor desaparece al cambiar el valor', () => {
    const form = formularioRegistro();
    aplicarErroresServidor(form, errorValidacion([{ campo: 'password', mensaje: 'La contraseña no es correcta' }]));
    form.controls.password.setValue('otra-contraseña-larga');
    expect(form.controls.password.errors).toBeNull();
  });

  it('admite rutas con índice dentro de un FormArray y une varios mensajes del mismo campo', () => {
    const form = new FormGroup({
      nombre: new FormControl('Comida'),
      alimentos: new FormArray([
        new FormGroup({ alimentoId: new FormControl(12), cantidad: new FormControl(0) }),
        new FormGroup({ alimentoId: new FormControl(40), cantidad: new FormControl(150) }),
      ]),
    });
    const error = errorValidacion([
      { campo: 'alimentos[0].cantidad', mensaje: 'Debe ser mayor que 0.' },
      { campo: 'alimentos[0].cantidad', mensaje: 'Debe ser un número entero.' },
    ]);

    expect(aplicarErroresServidor(form, error)).toBe(true);
    const cantidad = form.get(['alimentos', 0, 'cantidad'])!;
    expect(cantidad.errors).toEqual({ servidor: 'Debe ser mayor que 0. Debe ser un número entero.' });
    expect(form.get(['alimentos', 1, 'cantidad'])!.errors).toBeNull();
  });

  it('también funciona con un FormArray como raíz', () => {
    const lista = new FormArray([new FormControl('a'), new FormControl('b')]);
    expect(aplicarErroresServidor(lista, errorValidacion([{ campo: '[1]', mensaje: 'Repetido' }]))).toBe(true);
    expect(lista.at(1).errors).toEqual({ servidor: 'Repetido' });
  });

  it('devuelve false si ningún campo existe en el formulario o el error no trae campos', () => {
    const form = formularioRegistro();
    expect(aplicarErroresServidor(form, errorValidacion([{ campo: 'telefono', mensaje: 'No válido' }]))).toBe(false);
    expect(aplicarErroresServidor(form, errorValidacion([]))).toBe(false);

    const sinConexion = aApiError(new HttpErrorResponse({ status: 0 }));
    expect(aplicarErroresServidor(form, sinConexion)).toBe(false);
    expect(form.touched).toBe(false);
  });
});

describe('marcarTodoTocado', () => {
  it('marca como tocados todos los controles, también los anidados', () => {
    const form = new FormGroup({
      nombre: new FormControl(''),
      alimentos: new FormArray([new FormGroup({ cantidad: new FormControl(null) })]),
    });
    marcarTodoTocado(form);
    expect(form.controls.nombre.touched).toBe(true);
    expect(form.get(['alimentos', 0, 'cantidad'])!.touched).toBe(true);
  });
});
