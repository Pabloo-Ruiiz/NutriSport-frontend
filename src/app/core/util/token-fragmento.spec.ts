import { ActivatedRoute } from '@angular/router';

import { leerTokenDelFragmento } from './token-fragmento';

const ruta = (fragment: string | null) => ({ snapshot: { fragment } }) as unknown as ActivatedRoute;

describe('leerTokenDelFragmento', () => {
  beforeEach(() => history.replaceState({ navigationId: 3 }, '', '/verificar-email?origen=correo#token=abc'));

  it('lee el token y lo decodifica', () => {
    expect(leerTokenDelFragmento(ruta('token=abc'))).toBe('abc');
    expect(leerTokenDelFragmento(ruta('token=a%2Bb%3D%3D'))).toBe('a+b==');
  });

  it('admite otros parámetros en el fragmento', () => {
    expect(leerTokenDelFragmento(ruta('tipo=email&token=xyz'))).toBe('xyz');
  });

  it('quita el fragmento de la URL sin tocar la ruta, la query ni el estado', () => {
    leerTokenDelFragmento(ruta('token=abc'));
    expect(location.hash).toBe('');
    expect(location.pathname).toBe('/verificar-email');
    expect(location.search).toBe('?origen=correo');
    expect(history.state).toEqual({ navigationId: 3 });
  });

  it('null si no hay token, está vacío o mal codificado (y quita el fragmento igualmente)', () => {
    expect(leerTokenDelFragmento(ruta('otra=1'))).toBeNull();
    expect(leerTokenDelFragmento(ruta('token='))).toBeNull();
    expect(leerTokenDelFragmento(ruta('token'))).toBeNull();
    expect(leerTokenDelFragmento(ruta('token=%E0%A4%A'))).toBeNull();
    expect(location.hash).toBe('');
  });

  it('sin fragmento devuelve null y no toca la URL', () => {
    const espia = vi.spyOn(history, 'replaceState');
    expect(leerTokenDelFragmento(ruta(null))).toBeNull();
    expect(espia).not.toHaveBeenCalled();
    espia.mockRestore();
  });
});
