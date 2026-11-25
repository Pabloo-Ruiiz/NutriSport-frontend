import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { ApiError, DETALLE_ERROR_INTERNO, DETALLE_SIN_CONEXION, aApiError, leerRetryAfter } from './api-error';

/** Respuesta real del backend a un registro incompleto (NutriSport_API.md §3). */
const REGISTRO_INCOMPLETO = {
  type: 'urn:nutrisport:error:validacion',
  title: 'Datos no válidos',
  status: 400,
  detail: 'Los datos enviados no son válidos',
  instance: '/api/v1/auth/registro',
  codigo: 'VALIDACION',
  errors: [
    { campo: 'mayorDeEdad', mensaje: 'Debes declarar que eres mayor de edad' },
    { campo: 'password', mensaje: 'Debe tener entre 10 y 72 caracteres' },
  ],
};

function respuesta(status: number, error: unknown, cabeceras: Record<string, string> = {}, url = '/api/v1/auth/login') {
  return new HttpErrorResponse({ status, error, url, headers: new HttpHeaders(cabeceras) });
}

describe('aApiError', () => {
  it('convierte el Problem Details del registro incompleto (400 VALIDACION)', () => {
    const error = aApiError(respuesta(400, REGISTRO_INCOMPLETO, {}, '/api/v1/auth/registro'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(400);
    expect(error.codigo).toBe('VALIDACION');
    expect(error.titulo).toBe('Datos no válidos');
    expect(error.detalle).toBe('Los datos enviados no son válidos');
    expect(error.message).toBe('Los datos enviados no son válidos');
    expect(error.errores).toHaveLength(2);
    expect(error.erroresDe('password')).toEqual([
      { campo: 'password', mensaje: 'Debe tener entre 10 y 72 caracteres' },
    ]);
    expect(error.erroresDe('email')).toEqual([]);
    expect(error.url).toBe('/api/v1/auth/registro');
    expect(error.retryAfterSegundos).toBeNull();
    expect(error.esCodigo('VALIDACION')).toBe(true);
    expect(error.esCodigo('NO_AUTENTICADO', 'SIN_PERMISO')).toBe(false);
  });

  it('convierte un 401 NO_AUTENTICADO sin errores de campo', () => {
    const error = aApiError(
      respuesta(401, {
        type: 'urn:nutrisport:error:no_autenticado',
        title: 'No autenticado',
        status: 401,
        detail: 'Email o contraseña incorrectos',
        instance: '/api/v1/auth/login',
        codigo: 'NO_AUTENTICADO',
        errors: [],
      }),
    );

    expect(error.status).toBe(401);
    expect(error.codigo).toBe('NO_AUTENTICADO');
    expect(error.detalle).toBe('Email o contraseña incorrectos');
    expect(error.errores).toEqual([]);
    expect(error.esCodigo('NO_AUTENTICADO', 'SIN_PERMISO')).toBe(true);
  });

  it('lee Retry-After de un 429 LIMITE_EXCEDIDO y da el texto de espera', () => {
    const error = aApiError(
      respuesta(
        429,
        {
          type: 'urn:nutrisport:error:limite_excedido',
          title: 'Demasiadas peticiones',
          status: 429,
          detail: 'Has superado el número de intentos. Espera antes de volver a intentarlo',
          instance: '/api/v1/auth/login',
          codigo: 'LIMITE_EXCEDIDO',
          errors: [],
        },
        { 'Retry-After': '720' },
      ),
    );

    expect(error.codigo).toBe('LIMITE_EXCEDIDO');
    expect(error.retryAfterSegundos).toBe(720);
    expect(error.mensajeEspera()).toBe('Inténtalo de nuevo en 12 minutos.');
  });

  it('convierte status 0 en SIN_CONEXION', () => {
    const error = aApiError(
      new HttpErrorResponse({
        status: 0,
        statusText: 'Unknown Error',
        error: new ProgressEvent('error'),
        url: '/api/v1/perfil',
      }),
    );

    expect(error.status).toBe(0);
    expect(error.codigo).toBe('SIN_CONEXION');
    expect(error.detalle).toBe(DETALLE_SIN_CONEXION);
    expect(error.url).toBe('/api/v1/perfil');
  });

  it('convierte cualquier otra respuesta en ERROR_INTERNO con un texto genérico', () => {
    const html = aApiError(respuesta(502, '<html><body>Bad Gateway</body></html>', { 'Retry-After': '30' }));
    expect(html.status).toBe(502);
    expect(html.codigo).toBe('ERROR_INTERNO');
    expect(html.detalle).toBe(DETALLE_ERROR_INTERNO);
    expect(html.retryAfterSegundos).toBe(30);

    const js = aApiError(new TypeError('x is undefined'));
    expect(js.codigo).toBe('ERROR_INTERNO');
    expect(js.cause).toBeInstanceOf(TypeError);
  });

  it('lee el Problem Details también cuando llega como texto', () => {
    const error = aApiError(respuesta(400, JSON.stringify(REGISTRO_INCOMPLETO)));
    expect(error.codigo).toBe('VALIDACION');
    expect(error.errores).toHaveLength(2);
  });

  it('devuelve el mismo ApiError si ya lo es', () => {
    const original = aApiError(respuesta(400, REGISTRO_INCOMPLETO));
    expect(aApiError(original)).toBe(original);
  });
});

describe('ApiError.mensajeEspera', () => {
  const conEspera = (segundos: number | null) =>
    new ApiError({ status: 429, codigo: 'LIMITE_EXCEDIDO', titulo: '', detalle: '', retryAfterSegundos: segundos });

  it('redondea hacia arriba y usa singular y plural', () => {
    expect(conEspera(1).mensajeEspera()).toBe('Inténtalo de nuevo en 1 segundo.');
    expect(conEspera(45).mensajeEspera()).toBe('Inténtalo de nuevo en 45 segundos.');
    expect(conEspera(60).mensajeEspera()).toBe('Inténtalo de nuevo en 1 minuto.');
    expect(conEspera(61).mensajeEspera()).toBe('Inténtalo de nuevo en 2 minutos.');
    expect(conEspera(900).mensajeEspera()).toBe('Inténtalo de nuevo en 15 minutos.');
    expect(conEspera(3600).mensajeEspera()).toBe('Inténtalo de nuevo en 1 hora.');
    expect(conEspera(7500).mensajeEspera()).toBe('Inténtalo de nuevo en 2 horas y 5 minutos.');
  });

  it('sin Retry-After o con 0 da un texto sin cifra', () => {
    expect(conEspera(null).mensajeEspera()).toBe('Inténtalo de nuevo más tarde.');
    expect(conEspera(0).mensajeEspera()).toBe('Ya puedes intentarlo de nuevo.');
  });
});

describe('leerRetryAfter', () => {
  it('admite segundos y fechas HTTP', () => {
    const ahora = Date.parse('2026-11-25T10:00:00Z');
    expect(leerRetryAfter(new HttpHeaders({ 'Retry-After': '120' }), ahora)).toBe(120);
    expect(leerRetryAfter(new HttpHeaders({ 'Retry-After': 'Wed, 25 Nov 2026 10:12:00 GMT' }), ahora)).toBe(720);
    expect(leerRetryAfter(new HttpHeaders({ 'Retry-After': 'mañana' }), ahora)).toBeNull();
    expect(leerRetryAfter(new HttpHeaders(), ahora)).toBeNull();
  });
});
