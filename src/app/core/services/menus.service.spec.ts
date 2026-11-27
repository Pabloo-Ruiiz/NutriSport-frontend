import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MenusService } from './menus.service';

let servicio: MenusService;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servicio = TestBed.inject(MenusService);
  http = TestBed.inject(HttpTestingController);
});
afterEach(() => http.verify());

const BASE = '/api/v1/menus';

describe('MenusService', () => {
  it('listar solo envía page y size si no hay filtros', () => {
    servicio.listar({ favorito: null, desde: '  ', page: 0, size: 50 }).subscribe();
    const req = http.expectOne((r) => r.url === BASE);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().sort()).toEqual(['page', 'size']);
    expect(req.request.params.get('size')).toBe('50');
    req.flush({ content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 });
  });

  it('listar envía favorito (también false) y desde', () => {
    servicio.listar({ favorito: false, desde: '2026-11-23', page: 1, size: 20 }).subscribe();
    const req = http.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('favorito')).toBe('false');
    expect(req.request.params.get('desde')).toBe('2026-11-23');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ content: [] });
  });

  it('generar, detalle, actualizar, eliminar, duplicar y regenerar usan su método y ruta', () => {
    servicio.generar({ tipo: 'SEMANAL', fechaInicio: '2026-11-30' }).subscribe();
    servicio.detalle('m 1').subscribe();
    servicio.actualizar('m1', { favorito: true }).subscribe();
    servicio.eliminar('m1').subscribe();
    servicio.duplicar('m1', { fechaInicio: '2026-12-07' }).subscribe();
    servicio.regenerar('m1').subscribe();

    const generar = http.expectOne(`${BASE}/generar`);
    expect(generar.request.method).toBe('POST');
    expect(generar.request.body).toEqual({ tipo: 'SEMANAL', fechaInicio: '2026-11-30' });
    expect(http.expectOne(`${BASE}/m%201`).request.method).toBe('GET');
    const patch = http.expectOne((r) => r.method === 'PATCH');
    expect(patch.request.url).toBe(`${BASE}/m1`);
    expect(patch.request.body).toEqual({ favorito: true });
    expect(http.expectOne((r) => r.method === 'DELETE').request.url).toBe(`${BASE}/m1`);
    expect(http.expectOne(`${BASE}/m1/duplicar`).request.body).toEqual({ fechaInicio: '2026-12-07' });
    expect(http.expectOne(`${BASE}/m1/regenerar`).request.method).toBe('POST');
  });

  it('recetasDisponibles envía fecha y tipoComida, y q solo si tiene texto', () => {
    servicio.recetasDisponibles('2026-11-30', 'CENA', '  ').subscribe();
    servicio.recetasDisponibles('2026-11-30', 'COMIDA', ' pollo ').subscribe();
    const [sinQ, conQ] = http.match((r) => r.url === `${BASE}/recetas-disponibles`);
    expect(sinQ.request.params.keys().sort()).toEqual(['fecha', 'tipoComida']);
    expect(sinQ.request.params.get('tipoComida')).toBe('CENA');
    expect(conQ.request.params.get('q')).toBe('pollo');
  });

  it('las operaciones de una comida usan /menus/{id}/comidas/{comidaId}', () => {
    servicio.alternativas('m1', 'c1').subscribe();
    servicio.anadirComida('m1', { recetaId: 'r1', fecha: '2026-11-30', tipoComida: 'CENA', raciones: 1 }).subscribe();
    servicio.cambiarComida('m1', 'c1', { bloqueada: true }).subscribe();
    servicio.quitarComida('m1', 'c1').subscribe();
    servicio.sugerenciaIa('m1', 'c1').subscribe();
    servicio.aplicarSugerencia('m1', 'c1', 's1').subscribe();

    expect(http.expectOne(`${BASE}/m1/comidas/c1/alternativas`).request.method).toBe('GET');
    const anadir = http.expectOne((r) => r.method === 'POST' && r.url === `${BASE}/m1/comidas`);
    expect(anadir.request.body.recetaId).toBe('r1');
    const put = http.expectOne((r) => r.method === 'PUT');
    expect(put.request.url).toBe(`${BASE}/m1/comidas/c1`);
    expect(put.request.body).toEqual({ bloqueada: true });
    expect(http.expectOne((r) => r.method === 'DELETE').request.url).toBe(`${BASE}/m1/comidas/c1`);
    expect(http.expectOne(`${BASE}/m1/comidas/c1/sugerencia-ia`).request.body).toEqual({});
    expect(http.expectOne(`${BASE}/m1/comidas/c1/sugerencia-ia/aplicar`).request.body).toEqual({ sugerenciaId: 's1' });
  });

  it('registrarComida envía hora (HH:mm) solo si se indica', () => {
    servicio.registrarComida('m1', 'c1').subscribe();
    servicio.registrarComida('m1', 'c2', '14:30:00').subscribe();
    const sinHora = http.expectOne((r) => r.url === `${BASE}/m1/comidas/c1/registrar`);
    expect(sinHora.request.method).toBe('POST');
    expect(sinHora.request.params.keys()).toEqual([]);
    const conHora = http.expectOne((r) => r.url === `${BASE}/m1/comidas/c2/registrar`);
    expect(conHora.request.params.get('hora')).toBe('14:30');
  });
});
