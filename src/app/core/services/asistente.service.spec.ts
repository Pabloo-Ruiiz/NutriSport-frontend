import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AsistenteService } from './asistente.service';

const URL = '/api/v1/asistente';
let servicio: AsistenteService;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servicio = TestBed.inject(AsistenteService);
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => http.verify());

describe('AsistenteService', () => {
  it('conversaciones() pagina, limita size a 50 y solo envía archivada si se indica', () => {
    servicio.conversaciones({ archivada: true, page: 2, size: 200 }).subscribe();
    const p = http.expectOne((r) => r.url === `${URL}/conversaciones`).request.params;
    expect([p.get('page'), p.get('size'), p.get('archivada')]).toEqual(['2', '50', 'true']);

    servicio.conversaciones({ page: 0, size: 20 }).subscribe();
    expect(http.expectOne((r) => r.url === `${URL}/conversaciones`).request.params.has('archivada')).toBe(false);
  });

  it('crear, detalle y eliminar', () => {
    servicio.crear().subscribe();
    expect(http.expectOne({ method: 'POST', url: `${URL}/conversaciones` }).request.body).toBeNull();
    servicio.detalle('c-1').subscribe();
    http.expectOne({ method: 'GET', url: `${URL}/conversaciones/c-1` });
    servicio.eliminar('c-1').subscribe();
    http.expectOne({ method: 'DELETE', url: `${URL}/conversaciones/c-1` }).flush(null, { status: 204, statusText: '' });
  });

  it('actualizar() hace PATCH solo con los campos presentes', () => {
    servicio.actualizar('c-1', { titulo: '  Cenas  ' }).subscribe();
    expect(http.expectOne({ method: 'PATCH', url: `${URL}/conversaciones/c-1` }).request.body).toStrictEqual({
      titulo: 'Cenas',
    });
    servicio.actualizar('c-1', { archivada: true }).subscribe();
    expect(http.expectOne({ method: 'PATCH', url: `${URL}/conversaciones/c-1` }).request.body).toStrictEqual({
      archivada: true,
    });
  });

  it('enviar(), valorar() y sugerencias()', () => {
    servicio.enviar('c-1', '  Hola  ').subscribe();
    expect(http.expectOne({ method: 'POST', url: `${URL}/conversaciones/c-1/mensajes` }).request.body).toStrictEqual({
      contenido: 'Hola',
    });
    servicio.valorar('m-1', -1).subscribe();
    expect(http.expectOne({ method: 'POST', url: `${URL}/mensajes/m-1/valoracion` }).request.body).toStrictEqual({
      valor: -1,
    });
    servicio.sugerencias().subscribe();
    http.expectOne({ method: 'GET', url: `${URL}/sugerencias` });
  });
});
