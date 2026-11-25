import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { PerfilService } from './perfil.service';

const URL = `${environment.apiUrl}/perfil`;

describe('PerfilService', () => {
  let servicio: PerfilService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(PerfilService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('200 → true, y lo cachea', async () => {
    const promesa = servicio.existe();
    http.expectOne({ method: 'GET', url: URL }).flush({});
    expect(await promesa).toBe(true);
    expect(servicio.perfilExiste()).toBe(true);

    expect(await servicio.existe()).toBe(true);
    http.expectNone(URL);
  });

  it('404 → false, y lo cachea', async () => {
    const promesa = servicio.existe();
    http.expectOne(URL).flush({ codigo: 'NO_ENCONTRADO' }, { status: 404, statusText: 'Not Found' });
    expect(await promesa).toBe(false);
    expect(servicio.perfilExiste()).toBe(false);
  });

  it('otro error se propaga y no se cachea', async () => {
    const promesa = servicio.existe();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Error' });
    await expect(promesa).rejects.toMatchObject({ status: 500 });
    expect(servicio.perfilExiste()).toBeNull();

    const reintento = servicio.existe();
    http.expectOne(URL).flush({});
    expect(await reintento).toBe(true);
  });

  it('las llamadas simultáneas comparten una sola petición', async () => {
    const a = servicio.existe();
    const b = servicio.existe();
    http.expectOne(URL).flush({});
    expect(await Promise.all([a, b])).toEqual([true, true]);
  });

  it('marcarCreado() deja el perfil como existente sin preguntar', async () => {
    servicio.marcarCreado();
    expect(await servicio.existe()).toBe(true);
    http.expectNone(URL);
  });

  it('limpiar() olvida la caché y descarta la respuesta que llega tarde', async () => {
    const promesa = servicio.existe();
    servicio.limpiar();
    http.expectOne(URL).flush({});
    await promesa;
    expect(servicio.perfilExiste()).toBeNull();

    servicio.existe();
    http.expectOne(URL).flush(null, { status: 404, statusText: 'Not Found' });
  });
});
